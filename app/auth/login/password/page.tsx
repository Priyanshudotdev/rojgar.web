"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Logo from "@/components/ui/logo";
import TopNav from "@/components/ui/top-nav";
import { Loader2 } from "lucide-react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { redirectToDashboard } from "@/lib/auth/redirect";

export default function LoginPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const phone = typeof window !== "undefined" ? localStorage.getItem("phoneNumber") || "" : "";
  const verifyPassword = useAction(api.auth.verifyPassword);

  const handleSubmit = async () => {
    if (!password) {
      setError("Password is required.");
      return;
    }
    if (!phone) {
      setError("Session expired. Please start again.");
      router.replace('/auth/login');
      return;
    }
    setLoading(true);
    setError("");
    try {
      // Use the typed Convex action result instead of any casts
      type VerifyPasswordResult = Awaited<ReturnType<typeof verifyPassword>>;
      const res: VerifyPasswordResult = await verifyPassword({ phone, password });
      if (!res || !res.token) {
        setError("Incorrect password. Please try again or reset your password.");
        setLoading(false);
        return;
      }
      // Validate presence/format of expiresAt before calling session API
  const exp = Number(res.expiresAt);
      if (!Number.isFinite(exp) || exp <= 0) {
        setError('Login succeeded but session expiry is invalid. Please try again.');
        setLoading(false);
        return;
      }
      // Set httpOnly session cookie
      const sessionRes = await fetch('/api/session/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: res.token, expiresAt: exp }),
      });

      console.log(res)

      if (!sessionRes.ok) {
        setError('Failed to set session. Please try again.');
        setLoading(false);
        return;
      }
      // Minimal localStorage hygiene (do NOT store session token)
      // Keep phoneNumber so MeProvider can query Convex by phone for live data
      try {
        localStorage.setItem('verifiedUserId', res.userId);
        localStorage.removeItem('authFlow');
      } catch {}

      // Centralized redirect: single /api/me call then compute destination
      try {
        const meRes = await fetch('/api/me', { cache: 'no-store' });
        if (meRes.ok) {
          const me = await meRes.json();
          const userRole: string | undefined = res.role ?? me?.user?.role ?? undefined;
          const dest = redirectToDashboard(me?.profile, userRole);
          window.location.href = dest;
          return;
        } else {
          window.location.href = '/profile';
          return;
        }
      } catch {
        window.location.href = '/profile';
        return;
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Invalid credentials')) {
        setError('Incorrect password. Please try again or reset your password.');
      } else if (e.message && e.message.includes('network')) {
        setError('Network error. Please check your connection and try again.');
      } else {
        setError(e.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col text-white">
      <TopNav title="Enter Password" />
      <div className="px-6 pt-6 flex items-center mb-6">
        <Logo />
        <h1 className="text-2xl font-bold ml-2">Rojgar</h1>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <h2 className="text-xl font-semibold mb-4">Enter your password</h2>
        <Input
          type="password"
          value={password}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          className="bg-white/10 border border-white/20 text-white placeholder:text-white/60 focus:border-white mb-4"
        />
        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
        <Button
          disabled={!password || loading}
          onClick={handleSubmit}
          className="w-full bg-white text-green-600 hover:bg-gray-100 font-semibold py-3 mb-4 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {loading && <Loader2 className="w-5 h-5 animate-spin" />}
          {loading ? "Logging in…" : "Continue"}
        </Button>
        <p className="text-sm text-center">Forgot password? <button className="underline" onClick={() => router.push("/auth/forgot-password")}>Reset</button></p>
      </div>
      <div className="text-center px-6 pb-6 text-sm opacity-75">By continuing you agree to our Terms & Privacy.</div>
    </div>
  );
}
