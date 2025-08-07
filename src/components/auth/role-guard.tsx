'use client';

import { UserRole } from '@prisma/client';
import { ShieldX, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';


interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Component to protect routes based on user roles
 * 
 * @param allowedRoles - Array of roles that can access the content
 * @param fallback - Custom component to show when access is denied
 * @param redirectTo - URL to redirect when access is denied
 */
export function RoleGuard({ 
  children, 
  allowedRoles, 
  fallback,
  redirectTo = '/unauthorized' 
}: RoleGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2 text-gray-600">Verificando permissões...</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    router.push('/auth/signin');
    return null;
  }

  // Check if user has required role
  const hasRequiredRole = user?.role && allowedRoles.includes(user.role);

  if (!hasRequiredRole) {
    // Show custom fallback or default unauthorized message
    if (fallback) {
      return <>{fallback}</>;
    }

    // Redirect if specified
    if (redirectTo !== '/unauthorized') {
      router.push(redirectTo);
      return null;
    }

    // Default unauthorized component
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 text-red-500">
              <ShieldX className="h-12 w-12" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Você não tem permissão para acessar esta área.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Seu nível de acesso atual: <strong>{user?.role}</strong>
            </p>
            <p className="text-sm text-gray-600 text-center">
              Níveis necessários: <strong>{allowedRoles.join(', ')}</strong>
            </p>
            <Button 
              className="w-full" 
              onClick={() => router.push('/dashboard')}
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User has required role, render children
  return <>{children}</>;
}
