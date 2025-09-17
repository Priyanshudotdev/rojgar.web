'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to auth landing (Login / Register)
    router.push('/auth');
  }, [router]);

  return null;
}