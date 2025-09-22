"use client";

import { Card, CardContent, CardFooter, CardHeader } from "./card";
import { Button } from "./button";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Share2, MapPin, Users, Briefcase, Calendar } from "lucide-react";
import Logo from "./logo";
import type { EnrichedJob } from "@/types/jobs";

export type JobCardProps = {
  job: EnrichedJob;
  onDetailsClick?: () => void;
  onShare?: () => void;
};

function formatSalary(s: { min: number; max: number }) {
  let min = Number(s.min ?? 0);
  let max = Number(s.max ?? 0);
  if (min === 0 && max === 0) return 'Not disclosed';
  if (min > max) {
    const t = min;
    min = max;
    max = t;
  }
  const fmt = (n: number) => `₹${Math.round(n / 1000)}K`;
  return `${fmt(min)} - ${fmt(max)}`;
}

export function JobCard({ job, onDetailsClick, onShare }: JobCardProps) {
  const companyName = job.company?.name ?? "Employeer";
  const initials = (companyName || "E")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <Card className="bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-shadow">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              {job.company?.photoUrl ? (
                <Avatar className="w-full h-full rounded-lg">
                  <AvatarImage src={job.company.photoUrl ?? ""} alt={companyName ?? "Company"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              ) : (
                <Logo size={40} alt="Company logo" className="rounded-full" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-black text-base truncate">{job.title}</h3>
              <p className="text-xs text-gray-600 truncate">🏢 {companyName}</p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Share job"
            className="p-2 rounded hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
            onClick={onShare}
          >
            <Share2 className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pt-2 pb-0">
        <div className="space-y-2 text-xs text-gray-700">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span>
              {job.location.city}
              {job.location.locality ? `, ${job.location.locality}` : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span>{job.staffNeeded} Openings</span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-gray-500" />
            <span>{job.jobType}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span>Salary: {formatSalary(job.salary)}</span>
          </div>
          {job.experienceRequired && (
            <div className="flex items-start gap-2">
              <span className="inline-block w-4 h-4 rounded-sm bg-gray-200 mt-0.5" aria-hidden />
              <span className="truncate">Experience: {job.experienceRequired}</span>
            </div>
          )}
          {job.educationRequirements && job.educationRequirements.length > 0 && (
            <div className="flex items-start gap-2">
              <span className="inline-block w-4 h-4 rounded-sm bg-gray-200 mt-0.5" aria-hidden />
              <span className="truncate">Education: {job.educationRequirements.join(", ")}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="px-4 pt-3 pb-4">
        <Button
          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm"
          onClick={onDetailsClick}
          aria-label="See more details for this job"
        >
          See More Details
        </Button>
      </CardFooter>
    </Card>
  );
}
