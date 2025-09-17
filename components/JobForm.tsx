'use client';

import { useState, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';


type FormData = {
  jobTitle: string;
  city: string;
  locality: string;
  minIncome: string;
  maxIncome: string;
  jobType: string;
  staffNeeded: string;
  gender: string;
  education: string[];
  experience: string;
  comment: string;
  companyName: string;
  contactPerson: string;
  email: string;
  companyAddress: string;
  aboutCompany: string;
  companyPhoto: File | null;
  agreeToTerms: boolean;
};

type Errors = Partial<Record<keyof FormData, string>>;

export default function JobForm() {
  const [formData, setFormData] = useState<FormData>({
    jobTitle: '',
    city: '',
    locality: '',
    minIncome: '',
    maxIncome: '',
    jobType: '',
    staffNeeded: '',
    gender: '',
    education: [],
    experience: '',
    comment: '',
    companyName: '',
    contactPerson: '',
    email: '',
    companyAddress: '',
    aboutCompany: '',
    companyPhoto: null,
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState<Errors>({});

  const handleChange = (field: keyof FormData) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSelect = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files[0]) {
            setFormData(prev => ({ ...prev, companyPhoto: files[0] }));
        }
  };

  return (
    <div className="space-y-4">
        <h2 className="text-xl font-semibold mb-6 text-black">Job Description</h2>
        <Input placeholder="I want to Hire (e.g. cook)" value={formData.jobTitle} onChange={handleChange('jobTitle')} className="bg-white text-black" />
        {errors.jobTitle && <p className="text-red-500 text-sm">{errors.jobTitle}</p>}
        <Input placeholder="City" value={formData.city} onChange={handleChange('city')} className="bg-white text-black" />
        {errors.city && <p className="text-red-500 text-sm">{errors.city}</p>}
        <Input placeholder="Locality" value={formData.locality} onChange={handleChange('locality')} className="bg-white text-black" />
        {errors.locality && <p className="text-red-500 text-sm">{errors.locality}</p>}
        <div className="flex gap-4">
            <Input placeholder="Min" value={formData.minIncome} onChange={handleChange('minIncome')} className="bg-white text-black" />
            <Input placeholder="Max" value={formData.maxIncome} onChange={handleChange('maxIncome')} className="bg-white text-black" />
        </div>
        <div>
            <label className="block text-sm font-medium mb-2 text-black">Job Type</label>
            <div className="flex space-x-3">
                {['Office job', 'Work from home', 'Part time job'].map(option => (
                <button
                    key={option}
                    onClick={() => handleSelect('jobType', option)}
                    className={`px-4 py-2 rounded-full border ${
                    formData.jobType === option
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-black'
                    }`}
                >
                    {option}
                </button>
                ))}
            </div>
            {errors.jobType && <p className="text-red-500 text-sm">{errors.jobType}</p>}
        </div>
        <Input placeholder="No of staff needed" value={formData.staffNeeded} onChange={handleChange('staffNeeded')} className="bg-white text-black" />
        {errors.staffNeeded && <p className="text-red-500 text-sm">{errors.staffNeeded}</p>}

        <h2 className="text-xl font-semibold mb-6 text-black">Requirement</h2>
        <div>
            <label className="block text-sm font-medium mb-2 text-black">Gender</label>
            <div className="flex space-x-3">
                {['Male', 'Female', 'Both'].map(option => (
                <button
                    key={option}
                    onClick={() => handleSelect('gender', option)}
                    className={`px-4 py-2 rounded-full border ${
                    formData.gender === option
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-black'
                    }`}
                >
                    {option}
                </button>
                ))}
            </div>
            {errors.gender && <p className="text-red-500 text-sm">{errors.gender}</p>}
        </div>
        <div>
            <label className="block text-sm font-medium mb-2 text-black">Education</label>
            <div className="flex flex-wrap gap-2">
                {['10th', 'Below 10th', '12th', 'ITI/Diploma', 'Graduate', 'Post Graduate'].map(option => (
                <button
                    key={option}
                    onClick={() => handleMultiSelect('education', option)}
                    className={`px-3 py-2 rounded-full border text-sm ${
                    (formData.education as string[]).includes(option)
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
        <div>
            <label className="block text-sm font-medium mb-2 text-black">Experience</label>
            <div className="flex space-x-3">
                {['Any', 'Freshers', 'Experienced'].map(option => (
                <button
                    key={option}
                    onClick={() => handleSelect('experience', option)}
                    className={`px-4 py-2 rounded-full border ${
                    formData.experience === option
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-black'
                    }`}
                >
                    {option}
                </button>
                ))}
            </div>
            {errors.experience && <p className="text-red-500 text-sm">{errors.experience}</p>}
        </div>
        <div>
            <label className="block text-sm font-medium mb-2 text-black">Add comment</label>
            <Textarea
                placeholder="Add note"
                value={formData.comment}
                onChange={handleChange('comment')}
                className="bg-white text-black placeholder-gray-500"
            />
        </div>
    </div>
  );
}
