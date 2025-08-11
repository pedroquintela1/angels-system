import { useSession } from 'next-auth/react';
import { useMemo } from 'react';
import { UserRole, Resource, Action, hasPermission, getRolePermissions, canManageUser } from '@/lib/permissions';

// Interface para dados do usuário com permissões
export interface UserWithPermissions {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  kycStatus: string;
}

// Interface para o resultado do hook
export interface UsePermissionsResult {
  user: UserWithPermissions | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Verificações de permissão
  hasPermission: (resource: Resource, action: Action, context?: { ownerId?: string }) => boolean;
  canAccess: (resource: Resource) => boolean;
  canCreate: (resource: Resource) => boolean;
  canRead: (resource: Resource) => boolean;
  canUpdate: (resource: Resource) => boolean;
  canDelete: (resource: Resource) => boolean;
  canApprove: (resource: Resource) => boolean;
  canManage: (targetRole: UserRole) => boolean;
  
  // Verificações de role
  isUser: boolean;
  isSupport: boolean;
  isFinancial: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  
  // Verificações de status
  hasActiveKYC: boolean;
  isAccountActive: boolean;
  
  // Utilitários
  getAllPermissions: () => Array<{ resource: Resource; actions: Action[] }>;
  getRoleName: () => string;
  canAccessAdminPanel: boolean;
}

/**
 * Hook personalizado para gerenciar permissões do usuário
 * Fornece uma interface simples para verificar permissões no frontend
 */
export function usePermissions(): UsePermissionsResult {
  const { data: session, status } = useSession();
  
  // Memoizar dados do usuário para evitar recálculos desnecessários
  const user = useMemo((): UserWithPermissions | null => {
    if (!session?.user) return null;
    
    return {
      id: session.user.id,
      email: session.user.email || '',
      name: session.user.name || '',
      role: (session.user.role as UserRole) || UserRole.USER,
      kycStatus: session.user.kycStatus || 'PENDING',
    };
  }, [session]);
  
  // Estados básicos
  const isLoading = status === 'loading';
  const isAuthenticated = !!user;
  
  // Verificações de role
  const isUser = user?.role === UserRole.USER;
  const isSupport = user?.role === UserRole.SUPPORT;
  const isFinancial = user?.role === UserRole.FINANCIAL;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  
  // Verificações de status
  const hasActiveKYC = user?.kycStatus === 'APPROVED';
  const isAccountActive = true; // Simplificado - remover lógica de isActive
  
  // Verificação de acesso ao painel admin
  const canAccessAdminPanel = isAdmin || isSuperAdmin;
  
  // Função principal de verificação de permissão
  const checkPermission = (
    resource: Resource,
    action: Action,
    context?: { ownerId?: string }
  ): boolean => {
    if (!user) return false;
    
    const permissionContext = {
      userId: user.id,
      ownerId: context?.ownerId,
    };
    
    return hasPermission(user.role, resource, action, permissionContext);
  };
  
  // Funções de conveniência para ações específicas
  const canAccess = (resource: Resource): boolean => {
    return checkPermission(resource, Action.READ);
  };
  
  const canCreate = (resource: Resource): boolean => {
    return checkPermission(resource, Action.CREATE);
  };
  
  const canRead = (resource: Resource): boolean => {
    return checkPermission(resource, Action.READ);
  };
  
  const canUpdate = (resource: Resource): boolean => {
    return checkPermission(resource, Action.UPDATE);
  };
  
  const canDelete = (resource: Resource): boolean => {
    return checkPermission(resource, Action.DELETE);
  };
  
  const canApprove = (resource: Resource): boolean => {
    return checkPermission(resource, Action.APPROVE);
  };
  
  const canManageUserRole = (targetRole: UserRole): boolean => {
    if (!user) return false;
    return canManageUser(user.role, targetRole);
  };
  
  // Obter todas as permissões do usuário
  const getAllPermissions = () => {
    if (!user) return [];
    
    return getRolePermissions(user.role).map(permission => ({
      resource: permission.resource,
      actions: permission.actions,
    }));
  };
  
  // Obter nome amigável do role
  const getRoleName = (): string => {
    if (!user) return '';
    
    const roleNames = {
      [UserRole.USER]: 'Usuário',
      [UserRole.SUPPORT]: 'Suporte',
      [UserRole.FINANCIAL]: 'Financeiro',
      [UserRole.ADMIN]: 'Administrador',
      [UserRole.SUPER_ADMIN]: 'Super Administrador',
    };
    
    return roleNames[user.role] || 'Desconhecido';
  };
  
  return {
    user,
    isLoading,
    isAuthenticated,
    
    // Verificações de permissão
    hasPermission: checkPermission,
    canAccess,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canApprove,
    canManage: canManageUserRole,
    
    // Verificações de role
    isUser,
    isSupport,
    isFinancial,
    isAdmin,
    isSuperAdmin,
    
    // Verificações de status
    hasActiveKYC,
    isAccountActive,
    
    // Utilitários
    getAllPermissions,
    getRoleName,
    canAccessAdminPanel,
  };
}

/**
 * Hook específico para verificar se o usuário pode acessar uma página
 */
export function usePageAccess(requiredResource: Resource, requiredAction: Action = Action.READ) {
  const { hasPermission, isLoading, isAuthenticated } = usePermissions();
  
  const canAccessPage = useMemo(() => {
    if (isLoading) return null; // Loading state
    if (!isAuthenticated) return false; // Not authenticated
    
    return hasPermission(requiredResource, requiredAction);
  }, [hasPermission, requiredResource, requiredAction, isLoading, isAuthenticated]);
  
  return {
    canAccess: canAccessPage,
    isLoading,
    isAuthenticated,
  };
}

/**
 * Hook para verificar múltiplas permissões de uma vez
 */
export function useMultiplePermissions(
  permissions: Array<{ resource: Resource; action: Action }>
) {
  const { hasPermission, isLoading, isAuthenticated } = usePermissions();
  
  const results = useMemo(() => {
    if (!isAuthenticated) {
      return permissions.map(() => false);
    }
    
    return permissions.map(({ resource, action }) => 
      hasPermission(resource, action)
    );
  }, [permissions, hasPermission, isAuthenticated]);
  
  const hasAllPermissions = results.every(result => result);
  const hasAnyPermission = results.some(result => result);
  
  return {
    results,
    hasAllPermissions,
    hasAnyPermission,
    isLoading,
    isAuthenticated,
  };
}

/**
 * Hook para verificar se o usuário é proprietário de um recurso
 */
export function useOwnership(resourceOwnerId?: string) {
  const { user } = usePermissions();
  
  const isOwner = useMemo(() => {
    if (!user || !resourceOwnerId) return false;
    return user.id === resourceOwnerId;
  }, [user, resourceOwnerId]);
  
  return {
    isOwner,
    userId: user?.id,
  };
}
