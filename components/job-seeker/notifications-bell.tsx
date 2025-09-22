"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useCachedConvexQuery } from "@/hooks/useCachedConvexQuery";
import { invalidateKeys } from "@/hooks/useInvalidateCachedQuery";
import { useRouter } from "next/navigation";
import type { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

// Reuses the existing notifications backend by passing the job seeker's profileId
export function JobSeekerNotificationsBell({ profileId }: { profileId: Id<'profiles'> | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { data: unreadCount } = useCachedConvexQuery(
    api.notifications.countUnreadByProfile,
    profileId ? { profileId } : ("skip" as any),
    { key: 'js-notifications-unread', ttlMs: 15 * 1000 }
  );
  const { data: notifications } = useCachedConvexQuery(
    api.notifications.getByProfile,
    profileId ? { profileId, limit: 20 } : ("skip" as any),
    { key: 'js-notifications-list', ttlMs: 15 * 1000 }
  );
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsReadByProfile);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-600"
          disabled={!profileId}
          aria-label="Open notifications"
        >
          <Bell className="w-6 h-6 text-gray-700" />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 rounded-full">
              {Math.min(unreadCount as number, 9)}{(unreadCount as number) > 9 ? '+' : ''}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="px-2 py-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-800">Notifications</p>
          {(unreadCount ?? 0) > 0 && profileId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-gray-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-600"
              onClick={async () => {
                await markAllAsRead({ profileId });
                invalidateKeys(['js-notifications-unread', 'js-notifications-list']);
              }}
            >
              <CheckCheck className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {(!notifications || (notifications as any[]).length === 0) && (
          <div className="px-3 py-6 text-center text-sm text-gray-600">No notifications yet</div>
        )}
        {Array.isArray(notifications) && notifications.map((n) => (
          <DropdownMenuItem asChild key={n._id} className="focus:bg-gray-100 cursor-pointer">
            <button
              type="button"
              className={`w-full text-left px-2 py-2 text-sm ${n.read ? 'text-gray-600' : 'text-gray-900 font-medium'} hover:bg-gray-50 rounded-md`}
              onClick={async () => {
                if (!n.read) {
                  await markAsRead({ notificationId: n._id });
                  invalidateKeys(['js-notifications-unread', 'js-notifications-list']);
                }
                if (n.jobId) router.push(`/job/${n.jobId}`);
                setOpen(false);
              }}
            >
              <div className="flex items-start justify-between">
                <p className="mr-2">{n.title}</p>
                {!n.read && <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-600 inline-block" />}
              </div>
              <p className="text-xs mt-0.5 text-gray-600">{n.body}</p>
            </button>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
