"use client";

import { useEffect, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import TopNav from "@/components/ui/top-nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const steps = ["Basic Details", "Job Role", "Location"] as const;

type FormData = {
  name: string;
  age: string;
  dateOfBirth: string;
  gender: string;
  education: string;
  jobRole: string;
  yearOfExperience: string;
  location: string;
};

type Errors = Partial<Record<keyof FormData, string>>;

export default function JobSeekerOnboarding() {
  const [userId, setUserId] = useState<Id<"users"> | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    age: "",
    dateOfBirth: "",
    gender: "",
    education: "",
    jobRole: "",
    yearOfExperience: "",
    location: "",
  });

  const [errors, setErrors] = useState<Errors>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();
  const upsertJobSeekerProfile = useMutation(api.users.upsertJobSeekerProfile);

  // Session check
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const data = await res.json();
        if (data?.user?._id) {
          setUserId(data.user._id as Id<"users">);
          setLoadingSession(false);
        } else {
          setSessionError("Session expired. Please login again.");
          setLoadingSession(false);
          setTimeout(() => router.replace("/auth/login"), 2000);
        }
      } catch {
        setSessionError("Failed to validate session. Please try again.");
        setLoadingSession(false);
        setTimeout(() => router.replace("/auth/login"), 2000);
      }
    })();
  }, [router]);

  // Input handler
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target as { name: keyof FormData; value: string };
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear errors on valid change
    setErrors((prev) => {
      const next = { ...prev };
      if (name === 'age') {
        if (value.trim() && !isNaN(Number(value)) && Number(value) >= 18) delete next.age;
      } else if (name === 'yearOfExperience') {
        if (value.trim() && !isNaN(Number(value))) delete next.yearOfExperience;
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
      if (
        !formData.age.trim() ||
        isNaN(Number(formData.age)) ||
        Number(formData.age) < 18
      )
        newErrors.age = "Valid age (18+) is required";
      if (!formData.gender.trim()) newErrors.gender = "Gender is required";
      if (!formData.education.trim())
        newErrors.education = "Education is required";
    }

    if (step === 1) {
      if (!formData.jobRole.trim()) newErrors.jobRole = "Job role is required";
      if (!formData.yearOfExperience.trim()) newErrors.yearOfExperience = "Years of experience is required";
    }

    if (step === 2) {
      if (!formData.location.trim())
        newErrors.location = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Next / Prev
  const handleNext = () => {
    if (validateStep()) setStep((prev) => prev + 1);
  };

  const handlePrev = () => {
    setStep((prev) => prev - 1);
  };

  // Submit final data
  const handleSubmit = async () => {
    if (!validateStep() || !userId) return;
    setSubmitting(true);
    try {
      await upsertJobSeekerProfile({
        userId,
        name: formData.name,
        contactNumber: "",
        jobSeekerData: {
          dateOfBirth: Date.parse(formData.dateOfBirth),
          gender: formData.gender as "Male" | "Female" | "Other" | "Prefer not to say",
          education: formData.education,
          jobRole: formData.jobRole,
          experience: formData.yearOfExperience,
          location: formData.location,
          skills: [], 
        },
      });
      // Cache profile locally for dashboard header, if needed
      try { localStorage.setItem('jobSeekerProfile', JSON.stringify(formData)); } catch {}
      router.push("/dashboard/job-seeker");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-6 w-6 text-gray-500" />
      </div>
    );
  }

  if (sessionError) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{sessionError}</p>
          <Button className="bg-green-600 text-white" onClick={() => (window.location.href = '/auth/login')}>Login</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TopNav />
      <div className="max-w-lg mx-auto mt-8 p-6">
        <Card className="p-6 shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            {steps[step]}
          </h2>

          {step === 0 && (
            <div className="space-y-4">
              <Input
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
              />
              {errors.name && <p className="text-red-500">{errors.name}</p>}

              <Input
                name="age"
                placeholder="Age"
                value={formData.age}
                onChange={handleChange}
              />
              {errors.age && <p className="text-red-500">{errors.age}</p>}

              <Input
                name="gender"
                placeholder="Gender"
                value={formData.gender}
                onChange={handleChange}
              />
              {errors.gender && (
                <p className="text-red-500">{errors.gender}</p>
              )}

              <Input
                name="education"
                placeholder="Education"
                value={formData.education}
                onChange={handleChange}
              />
              {errors.education && (
                <p className="text-red-500">{errors.education}</p>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Input
                name="jobRole"
                placeholder="Job Role"
                value={formData.jobRole}
                onChange={handleChange}
              />
              {errors.jobRole && (
                <p className="text-red-500">{errors.jobRole}</p>
              )}

              <Input
                name="yearOfExperience"
                placeholder="Years of Experience (e.g., 2)"
                value={formData.yearOfExperience}
                onChange={handleChange}
              />
              {errors.yearOfExperience && (
                <p className="text-red-500">{errors.yearOfExperience}</p>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Input
                name="location"
                placeholder="Location"
                value={formData.location}
                onChange={handleChange}
              />
              {errors.location && (
                <p className="text-red-500">{errors.location}</p>
              )}
            </div>
          )}

          <div className="flex justify-between mt-6">
            {step > 0 && (
              <Button variant="outline" onClick={handlePrev}>
                Back
              </Button>
            )}

            {step < steps.length - 1 ? (
              <Button onClick={handleNext}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting && (
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                )}
                Submit
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
