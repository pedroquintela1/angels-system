import { UserRole } from '@prisma/client';

/**
 * Permission constants for role-based access control
 */

// Role hierarchies (higher number = more permissions)
export const ROLE_HIERARCHY = {
  [UserRole.USER]: 1,
  [UserRole.SUPPORT]: 2,
  [UserRole.FINANCIAL]: 3,
  [UserRole.ADMIN]: 4,
} as const;

// Permission groups for different features
export const PERMISSIONS = {
  // User management
  MANAGE_USERS: [UserRole.ADMIN],
  VIEW_USERS: [UserRole.ADMIN],

  // Opportunity management
  CREATE_OPPORTUNITIES: [UserRole.ADMIN],
  EDIT_OPPORTUNITIES: [UserRole.ADMIN],
  DELETE_OPPORTUNITIES: [UserRole.ADMIN],
  VIEW_ALL_OPPORTUNITIES: [UserRole.ADMIN],

  // Support system
  VIEW_TICKETS: [UserRole.SUPPORT, UserRole.ADMIN],
  MANAGE_TICKETS: [UserRole.SUPPORT, UserRole.ADMIN],
  ASSIGN_TICKETS: [UserRole.ADMIN],

  // Financial operations
  VIEW_FINANCIAL_DATA: [UserRole.FINANCIAL, UserRole.ADMIN],
  MANAGE_TRANSACTIONS: [UserRole.FINANCIAL, UserRole.ADMIN],
  APPROVE_WITHDRAWALS: [UserRole.FINANCIAL, UserRole.ADMIN],

  // Analytics and reports
  VIEW_ANALYTICS: [UserRole.ADMIN],
  EXPORT_REPORTS: [UserRole.ADMIN],

  // System administration
  MANAGE_SETTINGS: [UserRole.ADMIN],
  VIEW_SYSTEM_LOGS: [UserRole.ADMIN],
  MANAGE_COMPLIANCE: [UserRole.ADMIN],

  // User dashboard access
  ACCESS_USER_DASHBOARD: [
    UserRole.USER,
    UserRole.SUPPORT,
    UserRole.FINANCIAL,
    UserRole.ADMIN,
  ],
  ACCESS_ADMIN_DASHBOARD: [
    UserRole.SUPPORT,
    UserRole.FINANCIAL,
    UserRole.ADMIN,
  ],
} as const;

// Route permissions mapping
export const ROUTE_PERMISSIONS = {
  // Admin routes
  '/admin': PERMISSIONS.ACCESS_ADMIN_DASHBOARD,
  '/admin/users': PERMISSIONS.MANAGE_USERS,
  '/admin/opportunities': PERMISSIONS.VIEW_ALL_OPPORTUNITIES,
  '/admin/support': PERMISSIONS.VIEW_TICKETS,
  '/admin/financial': PERMISSIONS.VIEW_FINANCIAL_DATA,
  '/admin/analytics': PERMISSIONS.VIEW_ANALYTICS,
  '/admin/compliance': PERMISSIONS.MANAGE_COMPLIANCE,
  '/admin/settings': PERMISSIONS.MANAGE_SETTINGS,

  // User routes
  '/dashboard': PERMISSIONS.ACCESS_USER_DASHBOARD,
} as const;

// Helper functions
export const hasPermission = (
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean => {
  return requiredRoles.includes(userRole);
};

export const getHighestRole = (roles: UserRole[]): UserRole => {
  return roles.reduce((highest, current) =>
    ROLE_HIERARCHY[current] > ROLE_HIERARCHY[highest] ? current : highest
  );
};

export const isHigherRole = (role1: UserRole, role2: UserRole): boolean => {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2];
};

// Role descriptions for UI
export const ROLE_DESCRIPTIONS = {
  [UserRole.USER]: 'Usuário padrão com acesso ao painel de investidor',
  [UserRole.SUPPORT]: 'Agente de suporte com acesso ao sistema de tickets',
  [UserRole.FINANCIAL]:
    'Analista financeiro com acesso aos controles financeiros',
  [UserRole.ADMIN]: 'Administrador com acesso completo ao painel admin',
} as const;

// Role colors for UI
export const ROLE_COLORS = {
  [UserRole.USER]: 'blue',
  [UserRole.SUPPORT]: 'green',
  [UserRole.FINANCIAL]: 'purple',
  [UserRole.ADMIN]: 'orange',
} as const;
