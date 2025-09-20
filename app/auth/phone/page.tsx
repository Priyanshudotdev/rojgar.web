"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyPhoneRedirect() {
  const router = useRouter();
  useEffect(() => {
    const flow = (localStorage.getItem('authFlow') || 'login');
    router.replace(flow === 'register' ? '/auth/register' : '/auth/login');
  }, [router]);
  return null;
}