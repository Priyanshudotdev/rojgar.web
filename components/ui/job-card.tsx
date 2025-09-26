"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";

export const JobCard = ({
  job,
  onEdit,
  onDelete,
  onClose,
}: {
  job: any;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}) => {
  // Normalize fields to support multiple job shapes
  const companyName: string = job?.companyName ?? job?.company?.name ?? 'Company';
  const companyLogo: string | undefined = job?.companyLogo ?? job?.company?.photoUrl ?? undefined;
  const title: string = job?.title ?? 'Untitled Job';
  const description: string = typeof job?.description === 'string' ? job.description : '';
  const typeLabel: string = job?.type ?? job?.jobType ?? '';
  const locationLabel: string = (() => {
    const loc = job?.location;
    if (!loc) return '';
    if (typeof loc === 'string') return loc;
    if (typeof loc === 'object') {
      const city = loc?.city;
      const locality = loc?.locality;
      return [locality, city].filter(Boolean).join(', ');
    }
    return '';
  })();
  const salaryLabel: string = (() => {
    const s = job?.salary;
    if (!s) return '';
    if (typeof s === 'string') return s;
    const min = typeof s?.min === 'number' ? s.min : undefined;
    const max = typeof s?.max === 'number' ? s.max : undefined;
    const fmt = (n: number) =>
      new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n);
    if (min && max) return `₹${fmt(min)}–₹${fmt(max)}`;
    if (min) return `₹${fmt(min)}+`;
    if (max) return `Up to ₹${fmt(max)}`;
    return '';
  })();
  const skills: string[] = Array.isArray(job?.skills)
    ? (job.skills as string[])
    : Array.isArray(job?.educationRequirements)
      ? (job.educationRequirements as string[])
      : [];

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg border">
      <CardHeader className="flex flex-row items-center justify-between p-6 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-4">
          <Avatar>
            {companyLogo ? <AvatarImage src={companyLogo} alt={companyName} /> : null}
            <AvatarFallback>{(companyName || 'C').charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-800">
              {title}
            </CardTitle>
            <p className="text-sm text-gray-500">{companyName}</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Job Details
            </h3>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <strong>Location:</strong> {locationLabel}
              </p>
              <p>
                <strong>Type:</strong> {typeLabel}
              </p>
              <p>
                <strong>Salary:</strong> {salaryLabel}
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">
              Description
            </h3>
            <p className="text-sm text-gray-600">{description}</p>
          </div>
        </div>
        <div className="mt-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill: string) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
