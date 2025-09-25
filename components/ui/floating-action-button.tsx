"use client";
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type FloatingActionButtonProps = {
  label?: string;
  icon?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  position?: 'br' | 'bc' | 'bl';
  disabled?: boolean;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
};

const variantStyles: Record<string, string> = {
  primary: 'bg-green-600 hover:bg-green-700 text-white',
  secondary: 'bg-gray-800 hover:bg-gray-900 text-white',
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  danger: 'bg-red-600 hover:bg-red-700 text-white',
};

const sizeStyles: Record<string, string> = {
  sm: 'h-12 w-12 text-xs',
  md: 'h-14 w-14 text-sm',
  lg: 'h-16 w-16 text-base',
};

const positionStyles: Record<string, string> = {
  br: 'bottom-20 right-4',
  bc: 'bottom-20 left-1/2 -translate-x-1/2',
  bl: 'bottom-20 left-4',
};

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  label,
  icon,
  onClick,
  className,
  variant = 'primary',
  position = 'br',
  disabled,
  loading,
  size = 'md',
  ariaLabel,
}) => {
  const content = (
    <>
      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : icon}
      {label && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-black/80 text-white px-2 py-1 text-[10px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          {label}
        </span>
      )}
    </>
  );
  return (
    <button
      type="button"
      aria-label={ariaLabel || label || 'action'}
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(
        'group fixed z-40 rounded-full shadow-lg focus:outline-none focus-visible:ring-2 ring-offset-2 ring-offset-white ring-green-500 transition-all active:scale-95 flex items-center justify-center',
        variantStyles[variant],
        sizeStyles[size],
        positionStyles[position],
        disabled || loading ? 'opacity-60 cursor-not-allowed' : '',
        className,
      )}
    >
      {content}
    </button>
  );
};

export default FloatingActionButton;
