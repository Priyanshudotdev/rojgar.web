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
// Removed unused Select components
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import type { Id } from '@/convex/_generated/dataModel';

const steps = ['Job Description', 'Requirement', 'Employeer Details'] as const;

type Step = typeof steps[number];

type FormData = {
  // Job fields (Convex jobs schema)
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

  // Employeer fields (Convex companyData schema) – underlying keys remain companyData for backend compatibility
  companyName: string;
  contactPerson: string;
  email: string;
  companyAddress: string;
  aboutCompany: string;
  companyPhotoUrl: string;
  agreeToTerms: boolean;
};

type Errors = Partial<
  Record<
    | keyof FormData
    | 'city'
    | 'locality'
    | 'min'
    | 'max',
    string
  >
>;

export default function CompanyOnboardingPage() {
  "use client";
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
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const router = useRouter();
  const upsertCompanyProfile = useMutation(api.users.upsertCompanyProfile);
  const setCompanyPhoto = useMutation(api.profiles.setCompanyPhoto);

  // Get current user/profile via API (cookie-based) once on mount
  const [currentUserId, setCurrentUserId] = useState<Id<'users'> | null>(null);
  const [companyProfileId, setCompanyProfileId] = useState<Id<'profiles'> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data?.user?._id) setCurrentUserId(data.user._id as Id<'users'>);
          if (data?.profile?._id) setCompanyProfileId(data.profile._id as Id<'profiles'>);
          setLoadingSession(false);
        } else {
          setSessionError('Session expired. Please login again.');
          setLoadingSession(false);
        }
      } catch {
        setSessionError('Failed to validate session. Please try again.');
        setLoadingSession(false);
      }
    })();
  }, []);
  // removed unused isProfileComplete helper

  // Helper for nested fields
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
    // Clear errors for this field (supports nested keys in Errors type)
    if (field === 'city' || field === 'locality' || field === 'min' || field === 'max') {
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

  const [uploading, setUploading] = useState(false);

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
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (validateStep()) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        // Final submit: upsert profile only, then redirect
        try {
          setSubmitting(true);
          if (!currentUserId) throw new Error('Not authenticated');
          const profileId = await upsertCompanyProfile({
            userId: currentUserId,
            name: formData.contactPerson || formData.companyName,
            contactNumber: '',
            companyData: {
              companyName: formData.companyName,
              contactPerson: formData.contactPerson,
              email: formData.email || 'unknown@example.com',
              companyAddress: formData.companyAddress,
              aboutCompany: formData.aboutCompany || '',
              companyPhotoUrl: formData.companyPhotoUrl || '',
            },
          });
          // ensure we remember profile id for image updates later
          if (profileId) setCompanyProfileId(profileId as Id<'profiles'>);
          try { localStorage.setItem('companyProfile', JSON.stringify(formData)); } catch {}
          router.push('/dashboard/company');
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
    } else {
      router.push('/dashboard/company');
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
                      // If we already have a profile, persist immediately.
                      if (companyProfileId) {
                        await setCompanyPhoto({ profileId: companyProfileId, url });
                      } else if (currentUserId) {
                        // Attempt a lightweight upsert so image is not lost if user leaves.
                        // Provide minimal placeholder data; will be overwritten on final submit.
                        try {
                          const provisionalId = await upsertCompanyProfile({
                            userId: currentUserId,
                            name: formData.contactPerson || formData.companyName || 'Employeer',
                            contactNumber: '',
                            companyData: {
                              companyName: formData.companyName || 'Employeer',
                              contactPerson: formData.contactPerson || 'Contact',
                              email: formData.email || 'unknown@example.com',
                              companyAddress: formData.companyAddress || '',
                              aboutCompany: formData.aboutCompany || '',
                              companyPhotoUrl: url,
                            },
                          });
                          setCompanyProfileId(provisionalId as Id<'profiles'>);
                        } catch (e) {
                          console.warn('Provisional profile creation failed (will retry on submit):', e);
                        }
                      }
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

      
        default:
        return null;
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin w-8 h-8 text-green-600" />
        <span className="ml-3 text-lg text-gray-700">Validating session…</span>
      </div>
    );
  }
  if (sessionError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-lg text-red-600">{sessionError}</span>
        <Button className="ml-4 bg-green-600 text-white" onClick={() => window.location.href = '/auth/login'}>Login</Button>
      </div>
    );
  }
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