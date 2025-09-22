"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { JobSeekerNotificationsBell } from "./notifications-bell";
import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/logout-button";
import type { Id } from "@/convex/_generated/dataModel";

type Props = {
  loading?: boolean;
  name?: string | null;
  jobRole?: string | null;
  photoUrl?: string | null;
  profileId: Id<'profiles'> | null;
};

export function JobSeekerHeader({ loading, name, jobRole, photoUrl, profileId }: Props) {
  return (
    <header className="bg-white px-4 py-3 border-b sticky top-0 z-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative">
            {loading ? (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-200 animate-pulse" />
            ) : (
              <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                <AvatarImage src={photoUrl || ''} alt={name ? `${name}'s avatar` : 'User avatar'} />
                <AvatarFallback>
                  {(name || 'JS')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="min-w-0">
            {loading ? (
              <div className="space-y-1">
                <div className="h-4 w-32 sm:w-40 bg-gray-200 rounded animate-pulse" />
                <div className="h-3 w-24 sm:w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="truncate">
                  <h1 className="font-semibold text-black text-base sm:text-lg truncate">{name || 'Job Seeker'}</h1>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{jobRole || 'Find jobs'}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-gray-700 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-600"
                      aria-label="Open user menu"
                      aria-haspopup="menu"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-48">
                    <DropdownMenuItem onClick={() => window.location.assign('/profile')}>
                      <User className="h-4 w-4 mr-2" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => window.location.assign('/settings')}>
                      <Settings className="h-4 w-4 mr-2" /> Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <LogoutButton className="w-full justify-start" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}
          </div>
        </div>
        <JobSeekerNotificationsBell profileId={profileId} />
      </div>
    </header>
  );
}
