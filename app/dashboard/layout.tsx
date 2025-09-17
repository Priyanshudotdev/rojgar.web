import { ReactNode } from 'react';

export default function DashboardShell({ children }: { children: ReactNode }) {
  // Server component shell; child segment layouts handle role gating and navs
  return <>{children}</>;
}
