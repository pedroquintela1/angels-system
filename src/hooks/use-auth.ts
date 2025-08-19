import { UserRole } from '@prisma/client';
import { useSession } from 'next-auth/react';

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user,
    isLoading: status === 'loading',
    isAuthenticated: !!session?.user,
    isAdmin: session?.user?.role === UserRole.ADMIN,
    isSuperAdmin: session?.user?.role === UserRole.ADMIN,
    hasRole: (roles: UserRole[]) => {
      if (!session?.user?.role) {
        return false;
      }
      return roles.includes(session.user.role);
    },
  };
}
