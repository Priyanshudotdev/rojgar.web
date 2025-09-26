"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import TopNav from "@/components/ui/top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { useAction, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useToast } from '@/hooks/use-toast';
import { OtpErrorAlert } from '@/components/ui/otp-error-alert';
import { mapErrorToFormField, showOtpErrorToast, withRetry, getServiceStatus, storeDebugOtp, createAutoFillHandler, clearDebugOtp, isFakeOtpResponse } from '@/lib/utils/otp-error-handler';
import { FakeOtpDisplay } from '@/components/ui/fake-otp-display';
import { categorizeError, getUserFriendlyMessage } from '@/lib/utils/errors';
import { inspectSessionCookie, testSessionRetrieval, testCookieSetting, attemptSessionRecovery } from '@/lib/utils/session-debug';
import { getAvailableAlternatives, describeAlternative } from '@/lib/utils/alternative-verification';

const steps = ["Personal Details", "Professional Details", "Location & Photo", "Verification"] as const;

const skillsOptions = [
  "Cooking",
  "Driving",
  "Housekeeping",
  "Security",
  "Sales",
  "Data Entry",
  "Delivery",
  "Waiter",
  "Gardening",
  "Carpentry",
  "Plumbing",
  "Electrician",
  "Receptionist",
  "Customer Support",
  "Telecalling",
  "Packing",
] as const;

type FormData = {
  name: string;
  dateOfBirth: string;
  gender: "Male" | "Female" | "Other" | "Prefer not to say" | "";
  education: string;
  contactNumber: string;
  jobRole: string;
  yearOfExperience: string; // keep as string in state; validate and convert on submit
  location: string;
  skills: string[];
  profilePhotoUrl?: string;
  phone: string;
  otp: string;
  password: string;
};

type Errors = Partial<Record<keyof FormData, string>>;

export default function JobSeekerOnboarding() {
  const [newSkill, setNewSkill] = useState<string>("");

  const [formData, setFormData] = useState<FormData>({
    name: "",
    dateOfBirth: "",
    gender: "",
    education: "",
    contactNumber: "",
    jobRole: "",
    yearOfExperience: "",
    location: "",
    skills: [],
    phone: "",
    otp: "",
    password: "",
  });

  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [serviceDown, setServiceDown] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const { toast } = useToast();

  const router = useRouter();
  const checkUserExists = useAction(api.auth.checkUserExists);
  const requestOtp = useAction(api.auth.requestOtp);
  const verifyOtp = useAction(api.auth.verifyOtp);
  const createSession = useMutation(api.auth.createSession);
  const setPassword = useAction(api.auth.setPassword);


  // Input handler
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as { name: keyof FormData; value: string };
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear errors on valid change
    setErrors((prev) => {
      const next = { ...prev };
      if (name === 'yearOfExperience') {
        if (value.trim() && !isNaN(Number(value))) delete next.yearOfExperience;
      } else if (name === 'contactNumber') {
        const cleaned = value.replace(/\D/g, '');
        if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) delete (next as any).contactNumber;
      } else if (name in next && value.trim()) {
        // clear generic field error when non-empty
        delete (next as any)[name];
      }
      return next;
    });
  };

  // Validation per step
  const validateStep = (): boolean => {
    const newErrors: Errors = {};

    if (step === 0) {
      if (!formData.name.trim()) newErrors.name = "Full name is required";
      if (!formData.dateOfBirth.trim()) {
        newErrors.dateOfBirth = "Date of birth is required";
      } else {
        const ts = Date.parse(formData.dateOfBirth);
        if (!Number.isFinite(ts) || ts > Date.now()) newErrors.dateOfBirth = "Enter a valid past date";
      }
      if (!formData.gender) newErrors.gender = "Gender is required";
      if (!formData.education.trim())
        newErrors.education = "Education is required";
      // Contact number required and must be a valid 10-digit Indian number
      const cleaned = (formData.contactNumber || '').replace(/\D/g, '');
      if (!cleaned) newErrors.contactNumber = 'Contact number is required';
      else if (cleaned.length !== 10 || !/^[6-9]\d{9}$/.test(cleaned)) newErrors.contactNumber = 'Enter a valid 10-digit mobile number';
    }

    if (step === 1) {
      if (!formData.jobRole.trim()) newErrors.jobRole = "Job role is required";
      if (!formData.yearOfExperience.trim()) newErrors.yearOfExperience = "Years of experience is required";
      else if (!/^\d+$/.test(formData.yearOfExperience) || Number(formData.yearOfExperience) < 0) newErrors.yearOfExperience = "Enter a non-negative whole number";
      // skills are optional for now
    }

    if (step === 2) {
      if (!formData.location.trim())
        newErrors.location = "Location is required";
    }

    if (step === 3) {
      if (!formData.phone) newErrors.phone = 'Phone number is required';
      if (otpSent && !formData.otp) newErrors.otp = 'OTP is required';
      if (otpSent && !formData.password) newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Next / Prev
  const handleNext = async () => {
    if (!validateStep()) return;
    if (step < steps.length - 1) {
      setStep((prev) => prev + 1);
    }
  };
  // Send OTP for verification on step 3
  const handleSendOtp = async () => {
    if (!formData.phone) {
      setErrors((prev) => ({ ...prev, phone: 'Phone number is required' }));
      return;
    }
    setServiceDown(false);
    try {
      setSubmitting(true);
      const exists = await checkUserExists({ phone: formData.phone });
      if (exists.exists) {
        localStorage.setItem('loginNotice', 'This mobile number already has an account. Please login.');
        router.push('/auth/login');
        return;
      }
      const otpResult = await withRetry(() => requestOtp({ phone: formData.phone, purpose: 'register' }), 3);
      if (isFakeOtpResponse(otpResult)) {
        setDebugOtp((otpResult as any).debugCode);
        storeDebugOtp((otpResult as any).debugCode);
      }
      setServiceDown(false);
      setOtpSent(true);
    } catch (e: any) {
      const field = mapErrorToFormField(e);
      if (field)
        setErrors((prev) => ({ ...prev, [field]: getUserFriendlyMessage(categorizeError(e)) } as any));
      const status = getServiceStatus(e);
      setServiceDown(Boolean(status?.unavailable));
      showOtpErrorToast(e, { onRetry: handleSendOtp });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrev = () => {
    setStep((prev) => prev - 1);
  };

  // Submit final data
  const handleSubmit = async () => {
    if (!validateStep()) return;
    try {
      setSubmitting(true);
      localStorage.setItem("phoneNumber", formData.phone);
      console.info('[onboarding.submit] Verifying OTP and creating session');
      const result = await verifyOtp({ phone: formData.phone, code: formData.otp, role: 'job-seeker', onboardingData: formData });
      const userId = (result as any)?.userId as Id<'users'> | undefined;
      if (!userId) {
        setErrors((prev) => ({ ...prev, otp: 'Invalid OTP' }));
        return;
      }
      console.info('[onboarding.submit] Setting password');
      await setPassword({ userId, password: formData.password });
      const t0 = Date.now();
      console.info('[onboarding.submit] Creating session');
      const session = await createSession({ userId });
      const tokenLen = (session as any)?.token?.length || 0;
      console.info('[onboarding.submit] Session created', { tokenLen, exp: (session as any)?.expiresAt, ms: Date.now() - t0 });
      if (process.env.NODE_ENV !== 'production') {
        try {
          await testCookieSetting(session.token, session.expiresAt);
        } catch (e) {
          console.warn('[onboarding.submit] testCookieSetting failed', e);
        }
      }
      const setRes = await fetch('/api/session/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: session.token, expiresAt: session.expiresAt }),
      });
      if (!setRes.ok) {
        const text = await setRes.text().catch(() => setRes.statusText || 'Failed to set session');
        throw new Error(`Failed to set session: ${text}`);
      }
      // Verify cookie presence immediately (best-effort, limited in httpOnly)
      try {
        const ck = inspectSessionCookie();
        console.info('[onboarding.submit] Cookie inspection', ck);
      } catch {}
      try { window.dispatchEvent(new CustomEvent('session-updated')); } catch {}
      // Allow more time for cookie propagation
      await new Promise((res) => setTimeout(res, 500));
      // Validate session before redirect
      let meTest = await testSessionRetrieval();
      if (!(meTest.ok && meTest.status === 200)) {
        console.warn('[onboarding.submit] /api/me validation failed (first attempt)', { status: meTest.status });
        // Optional single recovery attempt in dev
        if (process.env.NODE_ENV !== 'production') {
          try { await attemptSessionRecovery(); } catch {}
          await new Promise(r => setTimeout(r, 150));
          meTest = await testSessionRetrieval();
        }
      }
      if (!(meTest.ok && meTest.status === 200)) {
        console.warn('[onboarding.submit] /api/me validation failed (final)', { status: meTest.status });
        alert('We could not verify your session. Please try again.');
        return;
      }
      try { clearDebugOtp(); } catch {}
      router.replace('/dashboard/job-seeker');
    } catch (e: any) {
      const msg = e?.message || 'Failed to submit. Please try again.';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Back handler aligned with company onboarding
  const handleBack = () => {
    if (step > 0) {
      setStep((prev) => prev - 1);
    } else {
      router.push('/role-selection');
    }
  };

  return (
    <div className="h-screen bg-white text-black">
      <TopNav title="Enter details" onBack={handleBack} />

      <div className="px-4 pt-4">
        <div className="flex">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-2 rounded ${index <= step ? 'bg-green-600' : 'bg-gray-200'} ${index > 0 ? 'ml-1' : ''}`}
            />)
          )}
        </div>
      </div>

      <div className="p-6">
        <h2 className="text-xl font-semibold mb-6">{steps[step]}</h2>

        {step === 0 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium mb-2">Full Name</label>
            <Input
              name="name"
              placeholder="Your full name"
              value={formData.name}
              onChange={handleChange}
              className="bg-white text-black"
            />
            {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}

            <label className="block text-sm font-medium mb-2">Date of Birth</label>
            <Input
              type="date"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleChange}
              className="bg-white text-black"
            />
            {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}

            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {['Male', 'Female', 'Other', 'Prefer not to say'].map((option) => (
                  <button
                  key={option}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, gender: option as FormData['gender'] }))}
                  className={`px-4 py-2 rounded-full border text-sm transition-colors ${
                    formData.gender === option
                    ? 'bg-green-100 border-green-500 text-green-700'
                    : 'border-gray-300 text-black hover:bg-gray-50'
                  }`}
                  >
                  {option}
                  </button>
                ))}
                </div>
              {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Education</label>
              <div className="flex flex-wrap gap-2">
                {['10th', 'Below 10th', '12th', 'ITI/Diploma', 'Graduate', 'Post Graduate'].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, education: option }))}
                    className={`px-3 py-2 rounded-full border text-sm ${
                      formData.education === option
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-black'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {errors.education && <p className="text-red-500 text-sm">{errors.education}</p>}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium mb-2">Job Role</label>
            <Input
              name="jobRole"
              placeholder="e.g., Cook, Driver"
              value={formData.jobRole}
              onChange={handleChange}
              className="bg-white text-black"
            />
            {errors.jobRole && <p className="text-red-500 text-sm">{errors.jobRole}</p>}

            <label className="block text-sm font-medium mb-2">Years of Experience</label>
            <Input
              name="yearOfExperience"
              type="number"
              min={0}
              step={1}
              placeholder="e.g., 2"
              value={formData.yearOfExperience}
              onChange={handleChange}
              className="bg-white text-black"
            />
            {errors.yearOfExperience && <p className="text-red-500 text-sm">{errors.yearOfExperience}</p>}

            <div>
              <label className="block text-sm font-medium mb-2">Skills</label>
              <div className="flex flex-wrap gap-2">
                {skillsOptions.map((skill) => {
                  const active = formData.skills.includes(skill);
                  return (
                    <button
                      key={skill}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          skills: active
                            ? prev.skills.filter((s) => s !== skill)
                            : [...prev.skills, skill],
                        }))
                      }
                      className={`px-3 py-2 rounded-full border text-sm ${
                        active
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : 'border-gray-300 text-black'
                      }`}
                    >
                      {skill}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <label className="block text-sm font-medium mb-2">Location</label>
            <Input
              name="location"
              placeholder="City / Area"
              value={formData.location}
              onChange={handleChange}
              className="bg-white text-black"
            />
            {errors.location && <p className="text-red-500 text-sm">{errors.location}</p>}

            <div>
              <label className="block text-sm font-medium mb-2">Profile Photo (optional)</label>
                <div className="w-full">
                <UploadButton<OurFileRouter, "profileImage">
                endpoint="profileImage"
                appearance={{
                  button: 'w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded-md',
                  container: 'w-full',
                }}
                onClientUploadComplete={async (res) => {
                  const url = (res as any)?.[0]?.url as string | undefined;
                  if (url) {
                  setFormData((prev) => ({ ...prev, profilePhotoUrl: url }));
                  }
                }}
                onUploadError={() => alert('Upload failed')}
                />
                </div>
              {formData.profilePhotoUrl && (
                <p className="text-sm text-green-600 mt-2">Image uploaded.</p>
              )}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-6">Verification</h2>
            <label className="block text-sm font-medium mb-2">Enter your mobile number</label>
            <div className="mb-6 flex items-center space-x-2">
              <div className="bg-white/10 border border-black rounded-lg px-3 py-3">
                <span className="text-black font-medium">+91</span>
              </div>
              <Input
                type="tel"
                value={formData.phone}
                placeholder="Mobile Number"
                maxLength={10}
                onChange={(e) => {
                  handleChange(e);
                  setServiceDown(false);
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                name="phone"
                className="flex-1 bg-white text-black placeholder:text-gray-500 focus:border-black"
              />
              <Button onClick={handleSendOtp} disabled={submitting || otpSent} className="bg-green-600 text-white">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : otpSent ? 'OTP Sent' : 'Send OTP'}
              </Button>
            </div>
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
            {otpSent && debugOtp && (
              <div className="mt-3">
                <FakeOtpDisplay
                  code={debugOtp}
                  onAutofill={createAutoFillHandler((val) =>
                    setFormData((s) => ({ ...s, otp: val })),
                  )}
                />
              </div>
            )}
            {serviceDown && (
              <OtpErrorAlert
                onRetry={handleSendOtp}
                onDismiss={() => setServiceDown(false)}
                alternatives={getAvailableAlternatives()
                  .filter((m) => m !== 'sms')
                  .map((m) => ({ label: describeAlternative(m), onClick: () => {} }))}
              />
            )}
            {otpSent && (
              <>
                <label className="block text-sm font-medium mb-2">Enter OTP</label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={(e) => {
                    handleChange(e);
                    setServiceDown(false);
                    setErrors((prev) => ({ ...prev, otp: undefined }));
                  }}
                  name="otp"
                  className="w-full bg-white text-black placeholder:text-gray-500 focus:border-black text-center text-xl tracking-widest"
                  maxLength={6}
                />
                {errors.otp && <p className="text-red-500 text-sm">{errors.otp}</p>}
                <label className="block text-sm font-medium mb-2">Set Password</label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                  name="password"
                  className="bg-white text-black placeholder:text-gray-500 focus:border-black"
                />
                {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
                {serviceDown && (
                  <OtpErrorAlert
                    onRetry={handleSendOtp}
                    onDismiss={() => setServiceDown(false)}
                    alternatives={getAvailableAlternatives()
                      .filter((m) => m !== 'sms')
                      .map((m) => ({ label: describeAlternative(m), onClick: () => {} }))}
                  />
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-8">
          {step < steps.length - 1 ? (
            <Button
              onClick={handleNext}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 disabled:opacity-60 flex items-center justify-center gap-2"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 disabled:opacity-60 flex items-center justify-center gap-2"
              disabled={!otpSent || submitting}
            >
              {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
              Submit
            </Button>
          )}
        </div>

        {step > 0 && (
          <div className="mt-4">
            <Button variant="outline" className="w-full" onClick={handleBack}>
              Back
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}