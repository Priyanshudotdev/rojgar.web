import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";
import { MeProvider } from "@/components/providers/me-provider";
import DashboardShell from "@/app/dashboard/layout";
import JobSeekerDashboard from "@/app/dashboard/job-seeker/page";
import CompanyDashboardPage from "@/app/dashboard/company/page";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;
  if (!token) redirect("/auth/phone");

  const user = await fetchQuery(api.auth.getUserBySession, { token });
  if (!user) redirect("/auth/phone");

  // Fetch profile for richer UI and render dashboard directly with initial MeProvider data
  const profileData = await fetchQuery(api.profiles.getProfileByUserId, { userId: user._id });
  const role = user.role;
  const meInitial = { user, profile: profileData } as any;

  return (
    <MeProvider initial={meInitial} skipInitialFetch={true}>
      <DashboardShell>
        {role === "job-seeker" ? (
          <JobSeekerDashboard />
        ) : role === "company" ? (
          <CompanyDashboardPage />
        ) : (
          <div className="min-h-screen grid place-items-center text-black">
            Unknown role. Please <a href="/auth/login" className="underline ml-1">log in</a> again.
          </div>
        )}
      </DashboardShell>
    </MeProvider>
  );
}
