"use client";

import { ReactNode, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type TopNavProps = {
  title?: string;
  onBack?: () => void;
  right?: ReactNode;
  className?: string;
};

export function TopNav({ title, onBack, right, className }: TopNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  // Only show this header inside dashboard pages
  const isDashboard = pathname?.startsWith('/dashboard');
  const target = useMemo(() => {
    if (!pathname) return "/";
    // If inside company dashboard routes
    if (pathname.startsWith('/dashboard/company')) return '/dashboard/company';
    // If inside job-seeker dashboard routes
    if (pathname.startsWith('/dashboard/job-seeker')) return '/dashboard/job-seeker';
    // Auth or onboarding can route to splash/dashboard
    if (pathname.startsWith('/auth') || pathname.startsWith('/onboarding')) return '/';
    // Public job detail routes can go to search/home
    if (pathname.startsWith('/job/')) return '/search';
    return '/';
  }, [pathname]);
  const handleBack = () => {
    if (onBack) return onBack();
    router.push(target);
  };
  if (!isDashboard) return null;

  return (
    <div className={`px-4 py-3 border-b sticky top-0 z-10 bg-white ${className ?? ""}`}>
      <div className="flex items-center justify-between">
        <button onClick={handleBack} className="cursor-pointer group" aria-label="Go back">
          <ArrowLeft className="w-6 h-6 text-black group-hover:opacity-80" />
        </button>
        {title ? <h1 className="font-semibold text-black text-base">{title}</h1> : <div />}
        <div className="min-w-[24px] min-h-[24px] flex items-center justify-end">{right ?? null}</div>
      </div>
    </div>
  );
}

export default TopNav;
