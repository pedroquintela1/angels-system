'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { usePermissions, usePageAccess } from '@/hooks/usePermissions';
import { UserRole, Resource, Action } from '@/lib/permissions';
import { AlertCircle, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Interface para configuração de proteção
export interface ProtectionConfig {
  // Permissões necessárias
  resource?: Resource;
  action?: Action;
  
  // Roles permitidos (alternativa às permissões)
  allowedRoles?: UserRole[];
  
  // Verificações adicionais
  requireKYC?: boolean;
  requireActiveMembership?: boolean;
  
  // Redirecionamentos
  redirectTo?: string;
  loginRedirect?: string;
  
  // Mensagens customizadas
  accessDeniedMessage?: string;
  loadingMessage?: string;
  
  // Comportamento
  showAccessDenied?: boolean;
  fallbackComponent?: React.ComponentType;
}

// Props para componentes protegidos
export interface ProtectedComponentProps {
  hasAccess: boolean;
  user: any;
  isLoading: boolean;
}

/**
 * Higher-Order Component para proteger páginas inteiras
 */
export function withPageProtection<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  config: ProtectionConfig
) {
  const ProtectedPage = (props: P) => {
    const router = useRouter();
    const { data: session, status } = useSession();
    const { user, isLoading: permissionsLoading, hasActiveKYC } = usePermissions();
    
    const { canAccess, isLoading: pageAccessLoading } = usePageAccess(
      config.resource || Resource.USER_PROFILE,
      config.action || Action.READ
    );
    
    const isLoading = status === 'loading' || permissionsLoading || pageAccessLoading;
    
    // Loading state
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">
              {config.loadingMessage || 'Verificando permissões...'}
            </p>
          </div>
        </div>
      );
    }
    
    // Not authenticated
    if (!session) {
      router.push(config.loginRedirect || '/auth/signin');
      return null;
    }
    
    // Check role-based access (if specified)
    if (config.allowedRoles && config.allowedRoles.length > 0) {
      if (!user || !config.allowedRoles.includes(user.role)) {
        return <AccessDeniedComponent config={config} reason="role" />;
      }
    }
    
    // Check permission-based access
    if (config.resource && canAccess === false) {
      return <AccessDeniedComponent config={config} reason="permission" />;
    }
    
    // Check KYC requirement
    if (config.requireKYC && !hasActiveKYC) {
      return <AccessDeniedComponent config={config} reason="kyc" />;
    }
    
    // Check active membership (would need to implement this check)
    if (config.requireActiveMembership) {
      // TODO: Implement membership check
    }
    
    // All checks passed, render the protected component
    return <WrappedComponent {...props} />;
  };
  
  ProtectedPage.displayName = `withPageProtection(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ProtectedPage;
}

/**
 * Higher-Order Component para proteger componentes específicos
 */
export function withComponentProtection<P extends object>(
  WrappedComponent: React.ComponentType<P & ProtectedComponentProps>,
  config: ProtectionConfig
) {
  const ProtectedComponent = (props: P) => {
    const { user, hasPermission, hasActiveKYC, isLoading } = usePermissions();
    
    // Check if user has required permission
    let hasAccess = true;
    
    if (config.resource && config.action) {
      hasAccess = hasPermission(config.resource, config.action);
    }
    
    if (config.allowedRoles && config.allowedRoles.length > 0) {
      hasAccess = hasAccess && (user ? config.allowedRoles.includes(user.role) : false);
    }
    
    if (config.requireKYC) {
      hasAccess = hasAccess && hasActiveKYC;
    }
    
    // If no access and fallback component exists, render it
    if (!hasAccess && config.fallbackComponent) {
      const FallbackComponent = config.fallbackComponent;
      return <FallbackComponent />;
    }
    
    // If no access and should show access denied, render access denied
    if (!hasAccess && config.showAccessDenied !== false) {
      return <AccessDeniedComponent config={config} reason="permission" inline />;
    }
    
    // If no access and shouldn't show anything, return null
    if (!hasAccess) {
      return null;
    }
    
    // Render the protected component with additional props
    return (
      <WrappedComponent
        {...props}
        hasAccess={hasAccess}
        user={user}
        isLoading={isLoading}
      />
    );
  };
  
  ProtectedComponent.displayName = `withComponentProtection(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return ProtectedComponent;
}

/**
 * Componente para renderizar condicionalmente baseado em permissões
 */
export function PermissionGate({
  resource,
  action,
  allowedRoles,
  requireKYC = false,
  fallback = null,
  children,
}: {
  resource?: Resource;
  action?: Action;
  allowedRoles?: UserRole[];
  requireKYC?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, hasPermission, hasActiveKYC, isLoading } = usePermissions();
  
  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 h-4 w-full rounded"></div>;
  }
  
  let hasAccess = true;
  
  // Check permission
  if (resource && action) {
    hasAccess = hasPermission(resource, action);
  }
  
  // Check roles
  if (allowedRoles && allowedRoles.length > 0) {
    hasAccess = hasAccess && (user ? allowedRoles.includes(user.role) : false);
  }
  
  // Check KYC
  if (requireKYC) {
    hasAccess = hasAccess && hasActiveKYC;
  }
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

/**
 * Componente de acesso negado
 */
function AccessDeniedComponent({
  config,
  reason,
  inline = false,
}: {
  config: ProtectionConfig;
  reason: 'role' | 'permission' | 'kyc';
  inline?: boolean;
}) {
  const router = useRouter();
  
  const getReasonMessage = () => {
    switch (reason) {
      case 'role':
        return 'Seu nível de acesso não permite visualizar esta página.';
      case 'permission':
        return 'Você não tem permissão para acessar este recurso.';
      case 'kyc':
        return 'É necessário completar a verificação KYC para acessar esta funcionalidade.';
      default:
        return 'Acesso negado.';
    }
  };
  
  const message = config.accessDeniedMessage || getReasonMessage();
  
  if (inline) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <Lock className="h-4 w-4" />
        <span>{message}</span>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-gray-900">
            Acesso Negado
          </CardTitle>
          <CardDescription className="text-gray-600">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {reason === 'kyc' && (
            <Button
              onClick={() => router.push('/dashboard/profile')}
              className="w-full"
            >
              Completar Verificação
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(config.redirectTo || '/dashboard')}
            className="w-full"
          >
            Voltar ao Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Hook para verificar acesso em tempo real
 */
export function useAccessControl(config: ProtectionConfig) {
  const { user, hasPermission, hasActiveKYC, isLoading } = usePermissions();
  
  const hasAccess = React.useMemo(() => {
    if (isLoading || !user) return false;
    
    let access = true;
    
    // Check permission
    if (config.resource && config.action) {
      access = hasPermission(config.resource, config.action);
    }
    
    // Check roles
    if (config.allowedRoles && config.allowedRoles.length > 0) {
      access = access && config.allowedRoles.includes(user.role);
    }
    
    // Check KYC
    if (config.requireKYC) {
      access = access && hasActiveKYC;
    }
    
    return access;
  }, [user, hasPermission, hasActiveKYC, isLoading, config]);
  
  return {
    hasAccess,
    isLoading,
    user,
  };
}
