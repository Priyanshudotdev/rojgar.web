"use client";

import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import TopNav from '@/components/ui/top-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { UploadButton } from '@uploadthing/react';
import type { OurFileRouter } from '@/app/api/uploadthing/core';
import { useAction, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const steps = ['Job Description', 'Requirement', 'Employeer Details', 'Verification'] as const;

type Step = typeof steps[number];

type FormData = {
  title: string;
  location: {
    city: string;
    locality?: string;
  };
  salary: {
    min: number | '';
    max: number | '';
  };
  jobType: 'Full-time' | 'Part-time' | 'Contract' | 'Internship' | 'Temporary' | '';
  staffNeeded: number | '';
  genderRequirement: 'Male' | 'Female' | 'Other' | 'Prefer not to say' | '';
  educationRequirements: string[];
  experienceRequired: string;
  description: string;
  companyName: string;
  contactPerson: string;
  email: string;
  companyAddress: string;
  aboutCompany: string;
  companyPhotoUrl: string;
  agreeToTerms: boolean;
  phone: string;
  otp: string;
  password: string;
};

type Errors = Partial<
  Record<
    | keyof FormData
    | 'city'
    | 'locality'
    | 'min'
    | 'max'
    | 'phone'
    | 'otp'
    | 'password',
    string
  >
>;

export default function CompanyOnboardingPage() {
  const [formData, setFormData] = useState<FormData>({
    title: '',
    location: { city: '', locality: '' },
    salary: { min: '', max: '' },
    jobType: '',
    staffNeeded: '',
    genderRequirement: '',
    educationRequirements: [],
    experienceRequired: '',
    description: '',
    companyName: '',
    contactPerson: '',
    email: '',
    companyAddress: '',
    aboutCompany: '',
    companyPhotoUrl: '',
    agreeToTerms: false,
    phone: '',
    otp: '',
    password: '',
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const router = useRouter();
  const checkUserExists = useAction(api.auth.checkUserExists);
  const requestOtp = useAction(api.auth.requestOtp);
  const verifyOtp = useAction(api.auth.verifyOtp);
  const createSession = useMutation(api.auth.createSession);
  const setPassword = useAction(api.auth.setPassword);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [debugOtp, setDebugOtp] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);

  const handleChange = (field: keyof FormData | string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (field === 'city' || field === 'locality') {
      setFormData(prev => ({ ...prev, location: { ...prev.location, [field]: value } }));
    } else if (field === 'min' || field === 'max') {
      setFormData(prev => ({
        ...prev,
        salary: {
          ...prev.salary,
          [field]: value === '' ? '' : Number(value),
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (field === 'city' || field === 'locality' || field === 'min' || field === 'max' || field === 'phone' || field === 'otp' || field === 'password') {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    } else if (errors[field as keyof FormData]) {
      setErrors(prev => ({ ...prev, [field as keyof FormData]: undefined }));
    }
  };

  const handleSelect = (field: keyof FormData, value: string) => {
    if (field === 'jobType' || field === 'genderRequirement' || field === 'experienceRequired') {
      setFormData(prev => ({ ...prev, [field]: value }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleMultiSelect = (field: keyof FormData, value: string) => {
    setFormData(prev => {
      const newValues = prev[field] as string[];
      if (newValues.includes(value)) {
        return { ...prev, [field]: newValues.filter(v => v !== value) };
      } else {
        return { ...prev, [field]: [...newValues, value] };
      }
    });
  };

  const validateStep = (): boolean => {
    const newErrors: Errors = {};
    if (currentStep === 0) {
      if (!formData.title) newErrors.title = 'Job title is required';
      if (!formData.location.city) newErrors.city = 'City is required';
      if (!formData.location.locality) newErrors.locality = 'Locality is required';
      if (!formData.jobType) newErrors.jobType = 'Job type is required';
      if (!formData.staffNeeded) newErrors.staffNeeded = 'Number of staff is required';
    }
    if (currentStep === 1) {
      if (!formData.genderRequirement) newErrors.genderRequirement = 'Gender is required';
      if (formData.educationRequirements.length === 0) newErrors.educationRequirements = 'Education is required';
      if (!formData.experienceRequired) newErrors.experienceRequired = 'Experience is required';
    }
    if (currentStep === 2) {
      if (!formData.companyName) newErrors.companyName = 'Employeer name is required';
      if (!formData.contactPerson) newErrors.contactPerson = 'Contact person is required';
      if (!formData.companyAddress) newErrors.companyAddress = 'Employeer address is required';
      if (!formData.agreeToTerms) newErrors.agreeToTerms = 'You must agree to the terms';
    }
    if (currentStep === 3) {
      if (!formData.phone) newErrors.phone = 'Phone number is required';
      if (otpSent && !formData.otp) newErrors.otp = 'OTP is required';
      if (otpSent && !formData.password) newErrors.password = 'Password is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async () => {
    if (validateStep()) {
      try {
        setSubmitting(true);
        const exists = await checkUserExists({ phone: formData.phone });
        if (exists.exists) {
          localStorage.setItem('loginNotice', 'This mobile number already has an account. Please login.');
          router.push('/auth/login');
          return;
        }
        const otpResult = await requestOtp({ phone: formData.phone, purpose: 'register' });
        if (otpResult.dev) {
          setDebugOtp(otpResult.debugCode);
        }
        setOtpSent(true);
      } catch (e: any) {
        alert(e.message || 'Failed to send OTP');
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleSubmit = async () => {
    if (validateStep()) {
      try {
        setSubmitting(true);
        localStorage.setItem("phoneNumber", formData.phone);
        const verifyResult = await verifyOtp({ phone: formData.phone, code: formData.otp, role: 'company', onboardingData: formData });
        if (verifyResult.userId) {
          const userId = verifyResult.userId as unknown as Id<'users'>;
          await setPassword({ userId, password: formData.password });
          const session = await createSession({ userId });
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
          localStorage.setItem('phoneNumber', formData.phone);
          // Notify MeProvider immediately that session cookie is set (httpOnly cookie cannot be read directly)
          try {
            window.dispatchEvent(new CustomEvent('session-updated'));
          } catch (e) {
            // ignore in non-browser environments
          }
          // Give MeProvider a short moment to pick up the session before redirecting
          await new Promise((res) => setTimeout(res, 100));
          router.replace('/dashboard/company');
        } else {
          setErrors({ ...errors, otp: 'Invalid OTP' });
        }
      } catch (e: any) {
        // Provide clearer guidance depending on where it failed
        const msg = e?.message || 'Failed to submit. Please try again.';
        alert(msg);
      } finally {
        setSubmitting(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      router.push('/role-selection');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-6 text-black">Job Description</h2>
            <label className="block text-sm font-medium mb-2 text-black">I want to hire</label>
            <Input
              placeholder="I want to Hire (e.g. cook)"
              value={formData.title}
              onChange={handleChange('title')}
              className="bg-white text-black"
            />
            {errors.title && <p className="text-red-500 text-sm">{errors.title}</p>}

            <label className="block text-sm font-medium mb-2 text-black">City</label>
            <Input
              placeholder="City"
              value={formData.location.city}
              onChange={handleChange('city')}
              className="bg-white text-black"
            />
            {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}

            <label className="block text-sm font-medium mb-2 text-black">Area</label>
            <Input
              placeholder="Locality"
              value={formData.location.locality || ''}
              onChange={handleChange('locality')}
              className="bg-white text-black"
            />
            {errors.locality && <p className="text-red-500 text-sm">{errors.locality}</p>}

            <div>
              <label className="block text-sm font-medium mb-2 text-black">Expected Income (₹)</label>
              <div className="flex gap-4">
                <div>
                  <Input
                    placeholder="Min"
                    inputMode="numeric"
                    value={formData.salary.min === '' ? '' : String(formData.salary.min)}
                    onChange={handleChange('min')}
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <Input
                    placeholder="Max"
                    inputMode="numeric"
                    value={formData.salary.max === '' ? '' : String(formData.salary.max)}
                    onChange={handleChange('max')}
                    className="bg-white text-black"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-black">Job Type</label>
              <div className="flex space-x-3 flex-wrap gap-2">
                {['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'].map(option => (
                  <button
                    key={option}
                    onClick={() => handleSelect('jobType', option as FormData['jobType'])}
                    className={`p-2 rounded-full text-sm border ${
                      formData.jobType === option
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-neutral-700'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {errors.jobType && <p className="text-red-500 text-sm">{errors.jobType}</p>}
            </div>

            <label className="block text-sm font-medium mb-2 text-black">Number of Staff Needed</label>
            <Input
              type="number"
              min="1"
              placeholder="No of staff needed"
              value={formData.staffNeeded === '' ? '' : String(formData.staffNeeded)}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === '') return setFormData(prev => ({ ...prev, staffNeeded: '' }));
                const num = Math.max(1, Number(raw));
                setFormData(prev => ({ ...prev, staffNeeded: Number.isNaN(num) ? '' : num }));
              }}
              className="bg-white text-black"
            />
            {errors.staffNeeded && <p className="text-red-500 text-sm">{errors.staffNeeded}</p>}
          </div>
        );
      case 1:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-6 text-black">Requirement</h2>
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Gender</label>
              <div className="flex space-x-3 flex-wrap gap-2">
                {['Male', 'Female', 'Other', 'Prefer not to say'].map(option => (
                  <button
                    key={option}
                    onClick={() => handleSelect('genderRequirement', option as FormData['genderRequirement'])}
                    className={`px-4 py-2 rounded-full border ${
                      formData.genderRequirement === option
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-black'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {errors.genderRequirement && <p className="text-red-500 text-sm">{errors.genderRequirement}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Education</label>
              <div className="flex flex-wrap gap-2">
                {['10th', 'Below 10th', '12th', 'ITI/Diploma', 'Graduate', 'Post Graduate'].map(option => (
                  <button
                    key={option}
                    onClick={() => handleMultiSelect('educationRequirements', option)}
                    className={`px-3 py-2 rounded-full border text-sm ${
                      formData.educationRequirements.includes(option)
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-black'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {errors.educationRequirements && <p className="text-red-500 text-sm">{errors.educationRequirements}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Experience</label>
              <div className="flex space-x-3">
                {['Any', 'Freshers', 'Experienced'].map(option => (
                  <button
                    key={option}
                    onClick={() => handleSelect('experienceRequired', option)}
                    className={`px-4 py-2 rounded-full border ${
                      formData.experienceRequired === option
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-black'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
              {errors.experienceRequired && <p className="text-red-500 text-sm">{errors.experienceRequired}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Job Description</label>
              <Textarea
                placeholder="Describe the role"
                value={formData.description}
                onChange={handleChange('description')}
                className="bg-white text-black placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-black">Employeer Photo</label>
              <UploadButton<OurFileRouter, "companyImage">
                disabled={uploading}
                appearance={{ button: 'bg-green-600 hover:bg-green-700 text-white' }}
                endpoint="companyImage"
                onUploadBegin={() => setUploading(true)}
                onClientUploadComplete={async (res) => {
                  try {
                    const url = (res as any)?.[0]?.url as string | undefined;
                    if (url) {
                      setFormData(prev => ({ ...prev, companyPhotoUrl: url }));
                    }
                  } finally {
                    setUploading(false);
                  }
                }}
                onUploadError={() => {
                  alert('Upload failed');
                  setUploading(false);
                }}
              />
              {formData.companyPhotoUrl && (
                <p className="text-sm text-green-600 mt-2">Image uploaded.</p>
              )}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-6 text-black">Employeer Details</h2>
            <label className="block text-sm font-medium mb-2 text-black">Employeer Name</label>
            <Input placeholder="Name of employeer" value={formData.companyName} onChange={handleChange('companyName')} className="bg-white text-black" />
            {errors.companyName && <p className="text-red-500 text-sm">{errors.companyName}</p>}
            <label className="block text-sm font-medium mb-2 text-black">Contact Person Name</label>
            <Input placeholder="Contact person name" value={formData.contactPerson} onChange={handleChange('contactPerson')} className="bg-white text-black" />
            {errors.contactPerson && <p className="text-red-500 text-sm">{errors.contactPerson}</p>}
            <label className="block text-sm font-medium mb-2 text-black">Employeer Address</label>
            <Textarea placeholder="Employeer Address" value={formData.companyAddress} onChange={handleChange('companyAddress')} className="bg-white text-black" />
            {errors.companyAddress && <p className="text-red-500 text-sm">{errors.companyAddress}</p>}
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="terms" 
                checked={formData.agreeToTerms} 
                onCheckedChange={(checked) => setFormData(prev => ({...prev, agreeToTerms: !!checked}))} 
              />
              <label htmlFor="terms" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-black">
                I agree to the Naukri's Terms and conditions
              </label>
            </div>
            {errors.agreeToTerms && <p className="text-red-500 text-sm">{errors.agreeToTerms}</p>}
          </div>
        );
      case 3:
        return (
          <div className="space-y-3">
            <h2 className="text-xl font-semibold mb-6 text-black">Verification</h2>
            <label className="block text-sm font-medium mb-2 text-black">Enter your mobile number</label>
            <div className="mb-6 flex items-center space-x-2">
              <div className="bg-white/10 border border-black rounded-lg px-3 py-3">
                <span className="text-black font-medium">+91</span>
              </div>
              <Input
                type="tel"
                value={formData.phone}
                placeholder="Mobile Number"
                maxLength={10}
                onChange={handleChange('phone')}
                className="flex-1 bg-white text-black placeholder:text-gray-500 focus:border-black"
              />
              <Button onClick={handleSendOtp} disabled={submitting || otpSent} className="bg-green-600 text-white">
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : otpSent ? 'OTP Sent' : 'Send OTP'}
              </Button>
            </div>
            {errors.phone && <p className="text-red-500 text-sm">{errors.phone}</p>}
            {debugOtp && <p className="text-green-500 text-sm">OTP: {debugOtp}</p>}
            {otpSent && (
              <>
                <label className="block text-sm font-medium mb-2 text-black">Enter OTP</label>
                <Input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={formData.otp}
                  onChange={handleChange('otp')}
                  className="w-full bg-white text-black placeholder:text-gray-500 focus:border-black text-center text-xl tracking-widest"
                  maxLength={6}
                />
                {errors.otp && <p className="text-red-500 text-sm">{errors.otp}</p>}
                <label className="block text-sm font-medium mb-2 text-black">Set Password</label>
                <Input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange('password')}
                  className="bg-white text-black placeholder:text-gray-500 focus:border-black"
                />
                {errors.password && <p className="text-red-500 text-sm">{errors.password}</p>}
              </>
            )}
          </div>
        );
      default:
        return null;
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
              className={`flex-1 h-2 rounded ${index <= currentStep ? 'bg-green-600' : 'bg-gray-200'} ${index > 0 ? 'ml-1' : ''}`}
            />
          ))}
        </div>
      </div>

      <div className="p-6">
        {renderStep()}
        
        <div className="mt-8">
          {currentStep < steps.length - 1 ? (
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
      </div>
    </div>
  );
}
