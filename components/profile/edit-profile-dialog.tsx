"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profileId: string;
  initial?: any;
};

export function EditProfileDialog({ open, onOpenChange, profileId, initial }: Props) {
  const { toast } = useToast();
  const updateProfile = useMutation(api.profiles.updateProfile);
  const [form, setForm] = React.useState({
    name: initial?.name ?? "",
    jobRole: initial?.jobSeekerData?.jobRole ?? "",
    education: initial?.jobSeekerData?.education ?? "",
    experience: initial?.jobSeekerData?.experience ?? "",
    location: initial?.jobSeekerData?.location ?? "",
    skills: (initial?.jobSeekerData?.skills ?? []).join(", "),
    profilePhotoUrl: initial?.jobSeekerData?.profilePhotoUrl ?? "",
  });

  React.useEffect(() => {
    setForm({
      name: initial?.name ?? "",
      jobRole: initial?.jobSeekerData?.jobRole ?? "",
      education: initial?.jobSeekerData?.education ?? "",
      experience: initial?.jobSeekerData?.experience ?? "",
      location: initial?.jobSeekerData?.location ?? "",
      skills: (initial?.jobSeekerData?.skills ?? []).join(", "),
      profilePhotoUrl: initial?.jobSeekerData?.profilePhotoUrl ?? "",
    });
  }, [initial]);

  async function onSave() {
    try {
      const jobSeekerData: any = {};
      if (form.jobRole.trim()) jobSeekerData.jobRole = form.jobRole.trim();
      if (form.education.trim()) jobSeekerData.education = form.education.trim();
      if (form.experience.trim()) jobSeekerData.experience = form.experience.trim();
      if (form.location.trim()) jobSeekerData.location = form.location.trim();
      const skillsArr = form.skills
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (skillsArr.length) jobSeekerData.skills = skillsArr;
      if (form.profilePhotoUrl.trim()) jobSeekerData.profilePhotoUrl = form.profilePhotoUrl.trim();

  const token = (typeof document !== 'undefined' ? document.cookie.split('; ').find(c => c.startsWith('sessionToken='))?.split('=')[1] : '') || '';
  const payload: any = { profileId: profileId as any, token };
      if (form.name.trim()) payload.name = form.name.trim();
      if (Object.keys(jobSeekerData).length) payload.jobSeekerData = jobSeekerData;

      await updateProfile(payload);
      toast({ title: "Profile updated" });
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to update profile", description: e?.message ?? String(e), variant: "destructive" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jobRole">Job role</Label>
            <Input id="jobRole" value={form.jobRole} onChange={(e) => setForm((f) => ({ ...f, jobRole: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="education">Education</Label>
            <Input id="education" value={form.education} onChange={(e) => setForm((f) => ({ ...f, education: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="experience">Experience</Label>
            <Input id="experience" value={form.experience} onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="skills">Skills (comma separated)</Label>
            <Input id="skills" value={form.skills} onChange={(e) => setForm((f) => ({ ...f, skills: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="profilePhotoUrl">Photo URL</Label>
            <Input id="profilePhotoUrl" value={form.profilePhotoUrl} onChange={(e) => setForm((f) => ({ ...f, profilePhotoUrl: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
