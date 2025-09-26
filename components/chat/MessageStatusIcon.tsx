"use client";
import React from 'react';

interface Props {
  optimistic?: boolean;
  deliveredAt?: number | null;
  readAt?: number | null;
  error?: boolean;
}

// WhatsApp-style message status icon renderer
// - Sending: animated dots
// - Sent: single gray check
// - Delivered: double gray checks
// - Read: double blue checks
export const MessageStatusIcon: React.FC<Props> = ({ optimistic, deliveredAt, readAt, error }) => {
  if (error) {
    return (
      <span aria-label="Send failed" title="Failed" className="text-red-500">!</span>
    );
  }
  if (optimistic) {
    return (
      <span aria-label="Sending" className="inline-flex items-center gap-0.5 text-white/80">
        <span className="inline-block w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-.2s]"></span>
        <span className="inline-block w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-.1s]"></span>
        <span className="inline-block w-1 h-1 rounded-full bg-current animate-bounce"></span>
      </span>
    );
  }
  if (readAt) {
    return (
      <span aria-label="Read" className="text-[#4FC3F7]">✓✓</span>
    );
  }
  if (deliveredAt) {
    return (
      <span aria-label="Delivered" className="text-gray-500">✓✓</span>
    );
  }
  // Fallback to sent state
  return (
    <span aria-label="Sent" className="text-gray-500">✓</span>
  );
};

export default MessageStatusIcon;
