"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/session/clear", { method: "POST" });
    } catch {}
    try {
      localStorage.clear();
    } catch {}
    router.replace("/auth/login");
  };

  return (
    <Button variant="outline" size="sm" className={className} onClick={handleLogout}>
      <LogOut className="w-4 h-4 mr-2" /> Logout
    </Button>
  );
}
