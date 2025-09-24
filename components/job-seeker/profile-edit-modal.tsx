"use client";
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

type InitialProfile = {
  _id: string;
  name?: string | null;
  jobSeekerData?: {
    jobRole?: string | null;
    location?: string | null;
    skills?: string[] | null;
    education?: string | null;
    experience?: string | null;
    profilePhotoUrl?: string | null;
  } | null;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialProfile: InitialProfile | null;
};

export function ProfileEditModal({ open, onOpenChange, initialProfile }: Props) {
  const { toast } = useToast();
  const mutate = useMutation(api.profiles.updateProfile);
  const [saving, setSaving] = React.useState(false);
  const [name, setName] = React.useState("");
  const [jobRole, setJobRole] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [education, setEducation] = React.useState("");
  const [experience, setExperience] = React.useState("");
  const [photoUrl, setPhotoUrl] = React.useState("");
  const [skills, setSkills] = React.useState<string[]>([]);
  const [skillInput, setSkillInput] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const MAX_SKILLS = 20;
  const MAX_SKILL_LEN = 32;

  React.useEffect(() => {
    if (!open) return;
    const p = initialProfile;
    setName((p?.name ?? "").trim());
    setJobRole((p?.jobSeekerData?.jobRole ?? "").trim());
    setLocation((p?.jobSeekerData?.location ?? "").trim());
    setEducation((p?.jobSeekerData?.education ?? "").trim());
    setExperience((p?.jobSeekerData?.experience ?? "").trim());
    setPhotoUrl((p?.jobSeekerData?.profilePhotoUrl ?? "").trim());
    setSkills(Array.isArray(p?.jobSeekerData?.skills) ? (p!.jobSeekerData!.skills as string[]).filter(Boolean) : []);
    setSkillInput("");
    setErrors({});
  }, [open, initialProfile]);

  function addSkillFromInput() {
    const val = skillInput.trim();
    if (!val) return;
    if (val.length > MAX_SKILL_LEN) {
      setErrors((e) => ({ ...e, skills: `Each skill must be <= ${MAX_SKILL_LEN} chars` }));
      return;
    }
    if (skills.length >= MAX_SKILLS) {
      setErrors((e) => ({ ...e, skills: `Maximum ${MAX_SKILLS} skills allowed` }));
      return;
    }
    if (skills.some((s) => s.toLowerCase() === val.toLowerCase())) {
      setSkillInput("");
      return;
    }
    setSkills((arr) => [...arr, val]);
    setSkillInput("");
  }

  function removeSkill(idx: number) {
    setSkills((arr) => arr.filter((_, i) => i !== idx));
  }

  async function onSubmit() {
    const nextErrors: Record<string, string> = {};
    if (!name.trim()) nextErrors.name = "Name is required";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (!initialProfile?._id) {
      toast({ title: "Profile not loaded", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // Build patch with only changed fields
      const jobSeekerDataPatch: Record<string, any> = {};
      const init = initialProfile;
      const initJS = init?.jobSeekerData ?? {};
      const cmp = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
      if (!cmp(jobRole.trim() || undefined, initJS.jobRole)) jobSeekerDataPatch.jobRole = jobRole.trim() || undefined;
      if (!cmp(location.trim() || undefined, initJS.location)) jobSeekerDataPatch.location = location.trim() || undefined;
      if (!cmp(education.trim() || undefined, initJS.education)) jobSeekerDataPatch.education = education.trim() || undefined;
      if (!cmp(experience.trim() || undefined, initJS.experience)) jobSeekerDataPatch.experience = experience.trim() || undefined;
      if (!cmp(photoUrl.trim() || undefined, initJS.profilePhotoUrl)) jobSeekerDataPatch.profilePhotoUrl = photoUrl.trim() || undefined;
      if (!cmp(skills, initJS.skills)) jobSeekerDataPatch.skills = skills;

      const payload: any = {
        profileId: initialProfile._id as any,
        token: (typeof document !== 'undefined' ? document.cookie.split('; ').find(c => c.startsWith('sessionToken='))?.split('=')[1] : '') || '',
      };
      if (!cmp(name.trim(), init?.name)) payload.name = name.trim();
      if (Object.keys(jobSeekerDataPatch).length > 0) payload.jobSeekerData = jobSeekerDataPatch;

      if (!payload.name && !payload.jobSeekerData) {
        toast({ title: "No changes to save" });
        setSaving(false);
        return;
      }
      await mutate(payload);
      toast({ title: "Profile updated" });
      // Notify MeProvider to refetch; also close modal
      try { window.dispatchEvent(new Event('session-updated')); } catch {}
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Failed to update profile", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent aria-describedby="profile-edit-desc">
        <DialogHeader>
          <DialogTitle>Edit profile</DialogTitle>
          <DialogDescription id="profile-edit-desc">Update your basic information to improve job matches.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
              disabled={saving}
            />
            {errors.name ? <p id="name-error" className="text-sm text-red-600">{errors.name}</p> : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="jobRole">Job role</Label>
            <Input id="jobRole" value={jobRole} onChange={(e) => setJobRole(e.target.value)} disabled={saving} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="location">Location</Label>
            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} disabled={saving} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="skills">Skills</Label>
            <div className="flex items-center gap-2">
              <Input
                id="skills"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addSkillFromInput();
                  }
                }}
                placeholder="Type a skill and press Enter"
                disabled={saving}
              />
              <Button type="button" variant="secondary" onClick={addSkillFromInput} disabled={saving}>Add</Button>
            </div>
            {errors.skills ? <p className="text-sm text-red-600">{errors.skills}</p> : null}
            <div className="mt-2 flex flex-wrap gap-2">
              {skills.map((s, idx) => (
                <Badge key={`${s}-${idx}`} variant="secondary" className="gap-2">
                  <span>{s}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${s}`}
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => removeSkill(idx)}
                    disabled={saving}
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="education">Education</Label>
            <Input id="education" value={education} onChange={(e) => setEducation(e.target.value)} disabled={saving} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="experience">Experience</Label>
            <Input id="experience" value={experience} onChange={(e) => setExperience(e.target.value)} disabled={saving} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="photoUrl">Photo URL</Label>
            <Input id="photoUrl" value={photoUrl} onChange={(e) => setPhotoUrl(e.target.value)} disabled={saving} />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button type="button" onClick={onSubmit} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProfileEditModal;
