import { cookies } from "next/headers";
import { api } from "@/convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("sessionToken")?.value;
  if (!token) redirect("/auth/phone");

  const user = await fetchQuery(api.auth.getUserBySession, { token });
  if (!user) redirect("/auth/phone");

  // Fetch profile for richer UI and redirect to dashboard
  const profileData = await fetchQuery(api.profiles.getProfileByUserId, { userId: user._id });
  const role = user.role;
  if (role === "job-seeker") {
    redirect("/dashboard/job-seeker");
  } else if (role === "company") {
    redirect("/dashboard/company");
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Your Profile</h1>
      <div className="space-y-2 text-black">
        <div>
          <span className="font-medium">Phone: </span>
          <span>{user.phone}</span>
        </div>
        <div>
          <span className="font-medium">Role: </span>
          <span>{role}</span>
        </div>
        <div>
          <span className="font-medium">Verified: </span>
          <span>{String(user.phoneVerified)}</span>
        </div>
        <pre className="text-xs bg-gray-100 p-2 rounded mt-4">{JSON.stringify(profileData, null, 2)}</pre>
      </div>
    </div>
  );
}
