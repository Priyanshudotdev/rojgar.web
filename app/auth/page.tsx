"use client";

import { useRouter } from "next/navigation";
import Logo from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

export default function AuthLanding() {
  const router = useRouter();
  return (
    <div className="h-screen flex flex-col text-white">
      <div className="px-6 pt-10 flex items-center gap-x-2 mb-12">
        <Logo />
        <h1 className="text-2xl font-bold">Rojgar</h1>
      </div>
      <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full px-6">
        <h2 className="text-2xl font-bold mb-2">Welcome</h2>
        <p className="text-white/80 mb-8">Login with mobile OTP or register to get started.</p>
        <div className="space-y-3">
          <Button
            className="w-full hover:bg-white/80 active:bg-white/60 bg-white text-green-600 hover:bg-gray-100 font-semibold py-3"
            onClick={() => {
              try {
                localStorage.setItem('authFlow', 'login');
                localStorage.removeItem('userRole');
              } catch {}
              router.push('/auth/phone');
            }}
          >
            Login with Mobile
          </Button>
          <Button
            variant="outline"
            className="w-full text-primary hover:bg-white/80 active:bg-white/60 border-white/40 font-semibold py-3"
            onClick={() => {
              try { localStorage.setItem('authFlow', 'register'); } catch {}
              router.push('/auth/register');
            }}
          >
            Register
          </Button>
        </div>
      </div>
      <div className="text-center px-6 pb-8">
        <p className="text-sm opacity-75">
          By continuing, you agree to our <span className="underline">Terms</span> and <span className="underline">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
