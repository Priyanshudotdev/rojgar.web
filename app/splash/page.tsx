'use client';

import Logo from '@/components/ui/logo';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SplashScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      router.push('/onboarding');
    }, 800);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="flex items-center bg-transparent h-screen justify-center bg-black px-6">
      <div className="text-center text-white">
        <div className="flex items-center gap-x-3 mb-4">
          <Logo />
          <h1 className="text-3xl font-bold">Rojgar</h1>
        </div>
        {isLoading && (
          <div className="w-8 mt-5 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
        )}
      </div>
    </div>
  );
}