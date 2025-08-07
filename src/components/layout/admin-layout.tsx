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
  Settings
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
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
    roles: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT', 'FINANCIAL'],
  },
  {
    name: 'Usuários',
    href: '/admin/users',
    icon: Users,
    roles: ['SUPER_ADMIN'],
  },
  {
    name: 'Oportunidades',
    href: '/admin/opportunities',
    icon: Target,
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    name: 'Suporte',
    href: '/admin/support',
    icon: MessageSquare,
    roles: ['SUPPORT', 'ADMIN', 'SUPER_ADMIN'],
  },
  {
    name: 'Financeiro',
    href: '/admin/financial',
    icon: DollarSign,
    roles: ['FINANCIAL', 'ADMIN', 'SUPER_ADMIN'],
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: BarChart3,
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    name: 'Compliance',
    href: '/admin/compliance',
    icon: Shield,
    roles: ['ADMIN', 'SUPER_ADMIN'],
  },
  {
    name: 'Configurações',
    href: '/admin/settings',
    icon: Settings,
    roles: ['SUPER_ADMIN'],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => 
    item.roles.includes(user?.role || '')
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <h1 className="text-xl font-bold text-red-600">Painel Administrativo</h1>
          </div>

          {/* User info */}
          <div className="border-b border-gray-200 p-4">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.name?.charAt(0) || 'A'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                <p className="text-xs text-gray-500">{user?.role}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {filteredNavigation.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/admin' && pathname.startsWith(item.href));
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-red-100 text-red-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-red-500' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Back to user panel */}
          <div className="border-t border-gray-200 p-4 space-y-2">
            <Link href="/dashboard">
              <Button variant="outline" className="w-full justify-start">
                <LayoutDashboard className="mr-3 h-5 w-5" />
                Painel do Usuário
              </Button>
            </Link>
            
            <Button
              variant="ghost"
              className="w-full justify-start"
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
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
