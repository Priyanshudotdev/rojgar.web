"use client";

import Logo from '@/components/ui/logo';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

const onboardingScreens = [
  {
    title: "Find your dream\njob now",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
  },
  {
    title: "Find your dream\nNOthing", 
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
  },
  {
    title: "Find your dream\nNOthing", 
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor"
  }
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState(0);

  const nextScreen = () => {
    if (currentScreen < onboardingScreens.length - 1) {
      setCurrentScreen(currentScreen + 1);
    } else {
      router.push("/role-selection")
      console.log('Navigate to role selection');
    }
  };

  const prevScreen = () => {
    if (currentScreen > 0) {
      setCurrentScreen(currentScreen - 1);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col text-white relative overflow-hidden">
      <div className="relative z-10 flex flex-col h-full px-6">
      <div className="flex items-center justify-center gap-3 pt-8 pb-16">
        <Logo />
        <h1 className="text-3xl font-bold">Rojgar</h1>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-xs">
        <h2 className="text-4xl font-normal mb-6 leading-tight whitespace-pre-line tracking-wide">
          {onboardingScreens[currentScreen].title}
        </h2>
        <p className="text-base opacity-90 leading-relaxed font-light">
          {onboardingScreens[currentScreen].description}
        </p>
        </div>
      </div>

      <div className="pb-8">
        <div className="flex justify-center mb-8 gap-2">
        {onboardingScreens.map((_, index) => (
          <div
          key={index}
          className={`h-1 rounded-full transition-all duration-300 ${
            index === currentScreen 
            ? 'w-8 bg-white' 
            : 'w-2 bg-white/40'
          }`}
          />
        ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
        <button
          onClick={prevScreen}
          disabled={currentScreen === 0}
          className={`w-14 h-14 rounded-full border border-white/40 flex items-center justify-center transition-opacity ${
          currentScreen === 0 ? 'opacity-40' : 'opacity-100'
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={nextScreen}
          className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
        </div>
      </div>

      {/* Home Indicator */}
      <div className="flex justify-center pb-2">
        <div className="w-32 h-1 bg-white/30 rounded-full"></div>
      </div>
      </div>
    </div>
  );
}