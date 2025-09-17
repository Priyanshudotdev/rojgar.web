"use client";

import { useEffect, useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import TopNav from '@/components/ui/top-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const steps = ['Basic Details', 'Job Role', 'Location'] as const;

type Step = typeof steps[number];

type FormData = {
  name: string;
  age: string;
  dateOfBirth: string;
  gender: string;
  education: string;
  jobRole: string;
  experience: string;
  location: string;
};

type Errors = Partial<Record<keyof FormData, string>>;

export default function JobSeekerOnboarding() {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    age: '',
    dateOfBirth: '',
    gender: '',
    education: '',
    jobRole: '',
    experience: '',
    location: ''
  });
  const [errors, setErrors] = useState<Errors>({});
  const router = useRouter();
  const upsertJobSeekerProfile = useMutation(api.users.upsertJobSeekerProfile);
  const [userId, setUserId] = useState<Id<'users'> | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.user?._id) setUserId(data.user._id as Id<'users'>);
        }
      } catch {}
    })();
  }, []);

  const handleChange = (field: keyof FormData) => (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Validate the field on change and clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      switch (field) {
        case 'name':
          if (value.trim()) delete newErrors.name;
          break;
        case 'age':
          if (value.trim() && !isNaN(Number(value)) && parseInt(value, 10) >= 18) delete newErrors.age;
          break;
        case 'dateOfBirth':
          if (value.trim()) delete newErrors.dateOfBirth;
          break;
        case 'jobRole':
          if (value.trim()) delete newErrors.jobRole;
          break;
        case 'experience':
          if (value.trim()) delete newErrors.experience;
          break;
        case 'location':
          if (value.trim()) delete newErrors.location;
          break;
      }
      return newErrors;
    });
  };

  const validateStep = (): boolean => {
    const newErrors: Errors = {};

    if (currentStep === 0) {
      if (!formData.name.trim()) newErrors.name = 'Name is required';
      if (!formData.age.trim()) {
        newErrors.age = 'Age is required';
      } else if (isNaN(Number(formData.age)) || parseInt(formData.age, 10) < 18) {
        newErrors.age = 'Age must be 18 or older';
      }
      if (!formData.dateOfBirth.trim()) newErrors.dateOfBirth = 'Date of birth is required';
      if (!formData.gender.trim()) newErrors.gender = 'Please select a gender';
      if (!formData.education.trim()) newErrors.education = 'Please select education';
    }

    if (currentStep === 1) {
      if (!formData.jobRole.trim()) newErrors.jobRole = 'Job role is required';
      if (!formData.experience.trim()) newErrors.experience = 'Experience is required';
    }

    if (currentStep === 2) {
      if (!formData.location.trim()) newErrors.location = 'Location is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Persist to Convex
        try {
          setSubmitting(true);
          if (!userId) throw new Error('Not authenticated');
          const dob = new Date(formData.dateOfBirth).getTime();
          await upsertJobSeekerProfile({
            userId,
            name: formData.name,
            contactNumber: '',
            jobSeekerData: {
              dateOfBirth: isNaN(dob) ? Date.now() : dob,
              gender: (formData.gender as any) || 'Prefer not to say',
              education: formData.education,
              jobRole: formData.jobRole,
              experience: formData.experience,
              location: formData.location,
              skills: [],
            },
          });
          localStorage.setItem('userProfile', JSON.stringify(formData));
          router.push('/dashboard/job-seeker');
        } catch (e: any) {
          alert(e.message || 'Failed to submit');
        } finally {
          setSubmitting(false);
        }
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setErrors({});
    } else {
      router.push('/dashboard/job-seeker');
    }
  };

  const handleSelect = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => {
      const newErrors = { ...prev };
      if (value.trim()) delete newErrors[field];
      return newErrors;
    });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold mb-6">Basic details</h2>

            <div>
              <label className="block text-sm font-medium mb-2">Name</label>
              <Input
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange('name')}
                className="bg-white text-black placeholder-gray-500"
              />
              {errors.name && <p className="text-red-500 text-sm">{errors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Age</label>
              <Input
                type="number"
                placeholder="Enter your Age"
                value={formData.age}
                onChange={handleChange('age')}
                inputMode="numeric"
                pattern="[0-9]*"
                style={{ MozAppearance: 'textfield' }}
                className="bg-white text-black placeholder-gray-500"
              />
              {errors.age && <p className="text-red-500 text-sm">{errors.age}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date of Birth</label>
              <Input
                type="date"
                value={formData.dateOfBirth}
                onChange={handleChange('dateOfBirth')}
                className="bg-white text-black placeholder-gray-500"
              />
              {errors.dateOfBirth && <p className="text-red-500 text-sm">{errors.dateOfBirth}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Gender</label>
              <div className="flex space-x-3">
                {['Male', 'Female', 'Other'].map((genderOption) => (
                  <button
                    key={genderOption}
                    onClick={() => handleSelect('gender', genderOption)}
                    className={`px-4 py-2 rounded-full border ${
                      formData.gender === genderOption
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-white'
                    }`}
                  >
                    {genderOption}
                  </button>
                ))}
              </div>
              {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Education</label>
              <div className="flex flex-wrap gap-2">
                {['Below 10th','10th', '12th', 'ITI/Diploma', 'Graduate', 'Post Graduate'].map((eduOption) => (
                  <button
                    key={eduOption}
                    onClick={() => handleSelect('education', eduOption)}
                    className={`px-3 py-2 rounded-full border text-sm ${
                      formData.education === eduOption
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-white'
                    }`}
                  >
                    {eduOption}
                  </button>
                ))}
              </div>
              {errors.education && <p className="text-red-500 text-sm">{errors.education}</p>}
            </div>
          </div>
        );

case 1:
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-6">Job Role</h2>

      <div>
        <label className="block text-sm font-medium mb-2">What kind of job are you looking for?</label>
        <Input
          placeholder="Search by job title/role"
          value={formData.jobRole}
          onChange={handleChange('jobRole')}
          className="bg-white text-black placeholder-gray-500"
        />
        {errors.jobRole && <p className="text-red-500 text-sm">{errors.jobRole}</p>}
      </div>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-blue-700 font-medium mb-2">💡 Suggested job roles</p>
        <div className="flex flex-wrap gap-2">
          {['Telesales', 'Field Sales', 'Delivery', 'Customer Support - BPO / Voice / Blended', 'Cook / Chef / Kitchen Help', 'Retail Sales & Operations'].map((role) => (
            <button
              key={role}
              onClick={() => handleSelect('jobRole', role)}
              className="px-3 py-2 bg-white rounded-lg text-sm border border-gray-200 hover:bg-gray-50 text-black"
            >
              {role}
            </button>
          ))}
        </div>
      </Card>

      <div>
        <label className="block text-sm font-medium mb-2">Experience (in years)</label>
        <Input
          type="number"
          min="0"
          placeholder="Enter years of experience"
          value={formData.experience}
          onChange={(e) => {
            const value = e.target.value;
            if (!value || /^[0-9]*$/.test(value)) {
              setFormData(prev => ({ ...prev, experience: value }));
              setErrors(prev => {
                const newErrors = { ...prev };
                if (value.trim()) delete newErrors.experience;
                return newErrors;
              });
            }
          }}
          className="bg-white text-black placeholder-gray-500"
        />
        {errors.experience && <p className="text-red-500 text-sm">{errors.experience}</p>}
      </div>
    </div>
  );


      case 2:
        return (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold mb-6">Location</h2>

            <div className="text-center py-8">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-2xl">📍</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Get the best job near you</h3>
              <Input
                placeholder="Search City"
                value={formData.location}
                onChange={handleChange('location')}
                className="bg-white text-black placeholder-gray-500"
              />
              {errors.location && <p className="text-red-500 text-sm">{errors.location}</p>}
              <Button className="w-full bg-green-600 hover:bg-green-700 text-white mt-4">
                📍 Pick current location
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-screen mt-0 text-white">
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
          <Button
            onClick={handleNext}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 disabled:opacity-60 flex items-center justify-center gap-2"
            disabled={submitting}
          >
            {submitting && <Loader2 className="w-5 h-5 animate-spin" />}
            {submitting
              ? currentStep === steps.length - 1
                ? 'Submitting...'
                : 'Saving...'
              : currentStep === steps.length - 1
                ? 'Submit'
                : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
