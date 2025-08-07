import { ReactNode } from 'react';

import { UserLayout } from '@/components/layout/user-layout';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <UserLayout>{children}</UserLayout>;
}
