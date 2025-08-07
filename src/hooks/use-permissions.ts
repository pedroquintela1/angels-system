import { UserRole } from '@prisma/client';

import { useAuth } from './use-auth';

/**
 * Hook for checking user permissions and roles
 */
export function usePermissions() {
  const { user, isAuthenticated } = useAuth();

  /**
   * Check if user has any of the specified roles
   */
  const hasAnyRole = (roles: UserRole[]): boolean => {
    if (!isAuthenticated || !user?.role) {return false;}
    return roles.includes(user.role);
  };

  /**
   * Check if user has specific role
   */
  const hasRole = (role: UserRole): boolean => {
    if (!isAuthenticated || !user?.role) {return false;}
    return user.role === role;
  };

  /**
   * Check if user is admin (ADMIN or SUPER_ADMIN)
   */
  const isAdmin = (): boolean => {
    return hasAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  };

  /**
   * Check if user is super admin
   */
  const isSuperAdmin = (): boolean => {
    return hasRole(UserRole.SUPER_ADMIN);
  };

  /**
   * Check if user has support access
   */
  const hasSupportAccess = (): boolean => {
    return hasAnyRole([UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  };

  /**
   * Check if user has financial access
   */
  const hasFinancialAccess = (): boolean => {
    return hasAnyRole([UserRole.FINANCIAL, UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  };

  /**
   * Check if user can manage users
   */
  const canManageUsers = (): boolean => {
    return hasRole(UserRole.SUPER_ADMIN);
  };

  /**
   * Check if user can manage opportunities
   */
  const canManageOpportunities = (): boolean => {
    return hasAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  };

  /**
   * Check if user can view analytics
   */
  const canViewAnalytics = (): boolean => {
    return hasAnyRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
  };

  /**
   * Check if user can manage system settings
   */
  const canManageSettings = (): boolean => {
    return hasRole(UserRole.SUPER_ADMIN);
  };

  /**
   * Get user's permission level as a number (higher = more permissions)
   */
  const getPermissionLevel = (): number => {
    if (!user?.role) {return 0;}
    
    switch (user.role) {
      case UserRole.USER:
        return 1;
      case UserRole.SUPPORT:
        return 2;
      case UserRole.FINANCIAL:
        return 3;
      case UserRole.ADMIN:
        return 4;
      case UserRole.SUPER_ADMIN:
        return 5;
      default:
        return 0;
    }
  };

  /**
   * Check if user has higher or equal permission level
   */
  const hasMinimumPermissionLevel = (requiredLevel: number): boolean => {
    return getPermissionLevel() >= requiredLevel;
  };

  return {
    // Role checks
    hasRole,
    hasAnyRole,
    isAdmin,
    isSuperAdmin,
    
    // Feature-specific permissions
    hasSupportAccess,
    hasFinancialAccess,
    canManageUsers,
    canManageOpportunities,
    canViewAnalytics,
    canManageSettings,
    
    // Permission levels
    getPermissionLevel,
    hasMinimumPermissionLevel,
    
    // User info
    currentRole: user?.role,
    isAuthenticated,
  };
}
