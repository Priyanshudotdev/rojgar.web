"use client";

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

type Props = {
  title?: string;
  showBack?: boolean;
  onBack?: () => void;
  left?: ReactNode; // custom left content, overrides title/back if provided
  right?: ReactNode; // custom right content (actions, bells, etc.)
  className?: string;
};

export function CompanyTopBar({ title, showBack, onBack, left, right, className }: Props) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) return onBack();
    router.push('/dashboard/company');
  };

  return (
    <header className={`bg-white px-4 py-3 border-b sticky top-0 z-10 ${className ?? ''}`}>
      <div className="flex items-center justify-between">
        {left ? (
          <div className="flex items-center gap-3">{left}</div>
        ) : (
          <div className="flex items-center gap-2">
            {showBack && (
              <button aria-label="Back" className="text-black group" onClick={handleBack}>
                <ArrowLeft className="w-6 h-6 group-hover:text-black" />
              </button>
            )}
            {title && <h1 className="font-semibold text-black text-lg">{title}</h1>}
          </div>
        )}
        <div className="flex items-center gap-2">{right}</div>
      </div>
    </header>
  );
}
