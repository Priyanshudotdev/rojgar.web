"use client";
// Client component: uses hooks (useState, useEffect, useRef)
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSendMessage, useTypingPublisher } from '../../hooks/useChat';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { Id } from '../../convex/_generated/dataModel';

interface MessageComposerProps {
  conversationId?: Id<'conversations'> | string | null;
  status?: string;
  helpers?: {
    addOptimisticMessage?: any;
    resolveOptimistic?: any;
    failOptimistic?: any;
  };
}

export const MessageComposer: React.FC<MessageComposerProps> = ({ conversationId, status, helpers }) => {
  const [value, setValue] = useState('');
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const disabled = !conversationId || (status && status !== 'active');

  const send = useSendMessage(conversationId as any, helpers);
  const { touch } = useTypingPublisher(conversationId as any);

  const handleSend = useCallback(async () => {
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    setSending(true);
    try {
      await send(trimmed);
      setValue('');
    } catch (err) {
      console.error('Failed to send message', err);
      // Optionally surface a toast here if your UI supports it
    } finally {
      setSending(false);
    }
  }, [value, send, disabled]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <div className="border-t border-gray-200 p-3 bg-gray-50">
      {disabled && (
        <div className="text-xs text-center text-gray-500 mb-2">
          {!conversationId
            ? 'Select a conversation to start messaging'
            : status !== 'active'
            ? 'Messaging disabled for this conversation'
            : null}
        </div>
      )}
      <div className={cn('flex items-end gap-3', disabled && 'opacity-60 pointer-events-none')}>
        <div className="flex-1">
          <textarea
            ref={ref}
            rows={1}
            placeholder="Type a message"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              touch();
            }}
            onKeyDown={onKeyDown}
            className="w-full resize-none overflow-hidden rounded-full border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#25D366] bg-white placeholder:text-gray-400"
            disabled={!!disabled}
          />
        </div>
        <Button
          onClick={handleSend}
          size="icon"
          disabled={sending || disabled || !value.trim()}
          className="h-10 w-10 rounded-full bg-[#25D366] hover:bg-[#20bf59] text-white"
        >
          {sending ? (
            <span className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin inline-block" />
          ) : (
            <span className="text-lg leading-none">➤</span>
          )}
        </Button>
      </div>
    </div>
  );
};
