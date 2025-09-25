import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSendMessage } from '../../hooks/useChat';
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
  const disabled = !conversationId || status && status !== 'active';

  const send = useSendMessage(conversationId as any, helpers);

  const handleSend = useCallback(async () => {
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    setSending(true);
    await send(trimmed);
    setValue('');
    setSending(false);
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
    <div className="border-t p-2 bg-white">
      {disabled && (
        <div className="text-xs text-center text-gray-500 mb-1">
          { !conversationId ? 'Select a conversation to start messaging' : status !== 'active' ? 'Messaging disabled for this conversation' : null }
        </div>
      )}
      <div className={cn('flex items-end gap-2', disabled && 'opacity-60 pointer-events-none')}> 
        <div className="flex-1">
          <textarea
            ref={ref}
            rows={1}
            placeholder="Type a message"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            className="w-full resize-none overflow-hidden rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            disabled={!!disabled}
          />
        </div>
        <Button onClick={handleSend} size="sm" disabled={sending || disabled || !value.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
};
