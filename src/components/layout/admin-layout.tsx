'use client';

import {
  LayoutDashboard,
  Users,
  Target,
  MessageSquare,
  DollarSign,
  BarChart3,
  Shield,
  LogOut,
  Settings,
  Gift,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ReactNode, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import MaintenanceBanner from '@/components/maintenance/maintenance-banner';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: ReactNode;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    roles: ['ADMIN', 'SUPPORT', 'FINANCIAL'],
  },
  {
    name: 'Usuários',
    href: '/admin/users',
    icon: Users,
    roles: ['ADMIN'],
  },
  {
    name: 'Oportunidades',
    href: '/admin/opportunities',
    icon: Target,
    roles: ['ADMIN'],
  },
  {
    name: 'Suporte',
    href: '/admin/support',
    icon: MessageSquare,
    roles: ['SUPPORT', 'ADMIN'],
  },
  {
    name: 'Financeiro',
    href: '/admin/financial',
    icon: DollarSign,
    roles: ['FINANCIAL', 'ADMIN'],
  },
  {
    name: 'Sorteios',
    href: '/admin/lotteries',
    icon: Gift,
    roles: ['ADMIN'],
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    roles: ['ADMIN'],
  },
  {
    name: 'Compliance',
    href: '/admin/compliance',
    icon: Shield,
    roles: ['ADMIN'],
  },
  {
    name: 'Configurações',
    href: '/admin/settings',
    icon: Settings,
    roles: ['ADMIN'],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isPending, startTransition] = useTransition();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSignOut = () => {
    setIsNavigating(true);
    signOut({ callbackUrl: '/' });
  };

  const handleNavigation = (href: string) => {
    if (pathname === href) return; // Não navegar se já estiver na página

    setIsNavigating(true);
    startTransition(() => {
      router.push(href);
      // Reset loading após um delay
      setTimeout(() => setIsNavigating(false), 300);
    });
  };

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-gray-700">
            <h1 className="text-xl font-bold text-blue-400">Angels System</h1>
          </div>

          {/* User info */}
          <div className="border-b border-gray-700 p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {filteredNavigation.map(item => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin' && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 group-hover:text-gray-300'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Back to user panel */}
          <div className="border-t border-gray-700 p-4 space-y-2">
            <Link href="/dashboard">
              <Button
                variant="outline"
                className="w-full justify-start border-gray-600 text-white bg-gray-800 hover:bg-white hover:text-gray-900 hover:border-gray-300"
              >
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Painel do Usuário
              </Button>
            </Link>

            <Button
              variant="ghost"
              className="w-full justify-start text-gray-300 hover:bg-gray-700 hover:text-white"
              onClick={handleSignOut}
            >
              <LogOut className="mr-3 h-5 w-5" />
              Sair
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <MaintenanceBanner />
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
