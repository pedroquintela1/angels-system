'use client';

import { ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { AdminLayout } from '@/components/layout/admin-layout';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayoutPage({ children }: AdminLayoutProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Se estiver na página de login do admin, não redirecionar
    if (pathname === '/admin/login') {
      return;
    }

    // Se não estiver carregando e não houver sessão, redirecionar para login
    if (status !== 'loading' && !session) {
      router.push('/admin/login');
      return;
    }

    // Se houver sessão, verificar se tem permissão de admin
    if (session?.user) {
      const allowedRoles = ['ADMIN', 'ADMIN', 'SUPPORT', 'FINANCIAL'];
      if (!allowedRoles.includes(session.user.role)) {
        router.push('/admin/login');
        return;
      }
    }
  }, [session, status, router, pathname]);

  // Se estiver na página de login, renderizar sem layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Se estiver carregando, mostrar loading
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  // Se não houver sessão ou não for admin, não renderizar nada (redirecionamento já foi feito)
  if (!session || !['ADMIN', 'ADMIN', 'SUPPORT', 'FINANCIAL'].includes(session.user.role)) {
    return null;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
