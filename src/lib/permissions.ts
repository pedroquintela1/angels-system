import { z } from 'zod';

// Definição de Roles do Sistema
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
  FINANCIAL = 'FINANCIAL',
}

// Definição de Recursos do Sistema
export enum Resource {
  // Usuários
  USERS = 'users',
  USER_PROFILE = 'user_profile',
  USER_KYC = 'user_kyc',

  // Oportunidades
  OPPORTUNITIES = 'opportunities',
  OPPORTUNITY_DOCUMENTS = 'opportunity_documents',

  // Investimentos
  INVESTMENTS = 'investments',
  INVESTMENT_RETURNS = 'investment_returns',

  // Financeiro
  TRANSACTIONS = 'transactions',
  PAYMENTS = 'payments',
  FINANCIAL_REPORTS = 'financial_reports',

  // Suporte
  SUPPORT_TICKETS = 'support_tickets',
  SUPPORT_RESPONSES = 'support_responses',

  // Sistema
  SYSTEM_SETTINGS = 'system_settings',
  AUDIT_LOGS = 'audit_logs',

  // Indicações
  REFERRALS = 'referrals',
  REFERRAL_BONUSES = 'referral_bonuses',

  // Sorteios
  LOTTERIES = 'lotteries',
  LOTTERY_PARTICIPANTS = 'lottery_participants',

  // Notificações
  NOTIFICATIONS = 'notifications',
  SYSTEM_NOTIFICATIONS = 'system_notifications',
}

// Definição de Ações
export enum Action {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  APPROVE = 'approve',
  REJECT = 'reject',
  ASSIGN = 'assign',
  EXPORT = 'export',
}

// Schema de Validação para Permissões
export const PermissionSchema = z.object({
  resource: z.nativeEnum(Resource),
  actions: z.array(z.nativeEnum(Action)),
  conditions: z.record(z.string(), z.any()).optional(), // Condições específicas (ex: owner only)
});

export type Permission = z.infer<typeof PermissionSchema>;

// Definição de Permissões por Role
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.USER]: [
    // Perfil próprio
    { resource: Resource.USER_PROFILE, actions: [Action.READ, Action.UPDATE] },
    { resource: Resource.USER_KYC, actions: [Action.READ, Action.UPDATE] },

    // Oportunidades (apenas leitura)
    { resource: Resource.OPPORTUNITIES, actions: [Action.READ] },

    // Investimentos próprios
    { resource: Resource.INVESTMENTS, actions: [Action.READ, Action.CREATE] },

    // Suporte (criar e ver próprios tickets)
    {
      resource: Resource.SUPPORT_TICKETS,
      actions: [Action.READ, Action.CREATE],
      conditions: { owner: true },
    },

    // Indicações próprias
    { resource: Resource.REFERRALS, actions: [Action.READ] },
    {
      resource: Resource.REFERRAL_BONUSES,
      actions: [Action.READ],
      conditions: { owner: true },
    },

    // Sorteios (participar e ver próprios)
    { resource: Resource.LOTTERIES, actions: [Action.READ] },
    {
      resource: Resource.LOTTERY_PARTICIPANTS,
      actions: [Action.READ, Action.CREATE],
      conditions: { owner: true },
    },

    // Notificações próprias
    {
      resource: Resource.NOTIFICATIONS,
      actions: [Action.READ, Action.UPDATE],
      conditions: { owner: true },
    },
  ],

  [UserRole.SUPPORT]: [],
  [UserRole.FINANCIAL]: [],
  [UserRole.ADMIN]: [
    // Acesso total a todos os recursos
    {
      resource: Resource.USERS,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },
    {
      resource: Resource.USER_PROFILE,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },
    {
      resource: Resource.USER_KYC,
      actions: [
        Action.CREATE,
        Action.READ,
        Action.UPDATE,
        Action.DELETE,
        Action.APPROVE,
        Action.REJECT,
      ],
    },

    {
      resource: Resource.OPPORTUNITIES,
      actions: [
        Action.CREATE,
        Action.READ,
        Action.UPDATE,
        Action.DELETE,
        Action.APPROVE,
        Action.REJECT,
      ],
    },
    {
      resource: Resource.OPPORTUNITY_DOCUMENTS,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },

    {
      resource: Resource.INVESTMENTS,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },
    {
      resource: Resource.INVESTMENT_RETURNS,
      actions: [
        Action.CREATE,
        Action.READ,
        Action.UPDATE,
        Action.DELETE,
        Action.APPROVE,
        Action.REJECT,
      ],
    },

    {
      resource: Resource.TRANSACTIONS,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },
    {
      resource: Resource.PAYMENTS,
      actions: [
        Action.CREATE,
        Action.READ,
        Action.UPDATE,
        Action.DELETE,
        Action.APPROVE,
        Action.REJECT,
      ],
    },
    {
      resource: Resource.FINANCIAL_REPORTS,
      actions: [
        Action.CREATE,
        Action.READ,
        Action.UPDATE,
        Action.DELETE,
        Action.EXPORT,
      ],
    },

    {
      resource: Resource.SUPPORT_TICKETS,
      actions: [
        Action.CREATE,
        Action.READ,
        Action.UPDATE,
        Action.DELETE,
        Action.ASSIGN,
      ],
    },
    {
      resource: Resource.SUPPORT_RESPONSES,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },

    {
      resource: Resource.SYSTEM_SETTINGS,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },
    {
      resource: Resource.AUDIT_LOGS,
      actions: [
        Action.CREATE,
        Action.READ,
        Action.UPDATE,
        Action.DELETE,
        Action.EXPORT,
      ],
    },

    {
      resource: Resource.REFERRALS,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },
    {
      resource: Resource.REFERRAL_BONUSES,
      actions: [
        Action.CREATE,
        Action.READ,
        Action.UPDATE,
        Action.DELETE,
        Action.APPROVE,
        Action.REJECT,
      ],
    },

    {
      resource: Resource.LOTTERIES,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },
    {
      resource: Resource.LOTTERY_PARTICIPANTS,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },

    {
      resource: Resource.NOTIFICATIONS,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },
    {
      resource: Resource.SYSTEM_NOTIFICATIONS,
      actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
    },
  ],
};

// Definir permissões explicitamente para evitar referência circular
ROLE_PERMISSIONS[UserRole.SUPPORT] = [
  // Permissões básicas de usuário
  { resource: Resource.USER_PROFILE, actions: [Action.READ, Action.UPDATE] },
  { resource: Resource.USER_KYC, actions: [Action.READ, Action.UPDATE] },
  { resource: Resource.OPPORTUNITIES, actions: [Action.READ] },
  { resource: Resource.INVESTMENTS, actions: [Action.READ, Action.CREATE] },
  {
    resource: Resource.SUPPORT_TICKETS,
    actions: [Action.READ, Action.CREATE],
    conditions: { owner: true },
  },
  { resource: Resource.REFERRALS, actions: [Action.READ] },
  {
    resource: Resource.REFERRAL_BONUSES,
    actions: [Action.READ],
    conditions: { owner: true },
  },
  { resource: Resource.LOTTERIES, actions: [Action.READ] },
  {
    resource: Resource.LOTTERY_PARTICIPANTS,
    actions: [Action.READ, Action.CREATE],
    conditions: { owner: true },
  },
  {
    resource: Resource.NOTIFICATIONS,
    actions: [Action.READ, Action.UPDATE],
    conditions: { owner: true },
  },

  // Permissões específicas de suporte
  {
    resource: Resource.SUPPORT_TICKETS,
    actions: [Action.READ, Action.UPDATE, Action.ASSIGN],
  },
  {
    resource: Resource.SUPPORT_RESPONSES,
    actions: [Action.CREATE, Action.READ, Action.UPDATE],
  },
  { resource: Resource.USERS, actions: [Action.READ] },
  {
    resource: Resource.SYSTEM_NOTIFICATIONS,
    actions: [Action.CREATE, Action.READ],
  },
];

ROLE_PERMISSIONS[UserRole.FINANCIAL] = [
  // Permissões básicas de usuário
  { resource: Resource.USER_PROFILE, actions: [Action.READ, Action.UPDATE] },
  { resource: Resource.USER_KYC, actions: [Action.READ, Action.UPDATE] },
  { resource: Resource.OPPORTUNITIES, actions: [Action.READ] },
  { resource: Resource.INVESTMENTS, actions: [Action.READ, Action.CREATE] },
  {
    resource: Resource.SUPPORT_TICKETS,
    actions: [Action.READ, Action.CREATE],
    conditions: { owner: true },
  },
  { resource: Resource.REFERRALS, actions: [Action.READ] },
  {
    resource: Resource.REFERRAL_BONUSES,
    actions: [Action.READ],
    conditions: { owner: true },
  },
  { resource: Resource.LOTTERIES, actions: [Action.READ] },
  {
    resource: Resource.LOTTERY_PARTICIPANTS,
    actions: [Action.READ, Action.CREATE],
    conditions: { owner: true },
  },
  {
    resource: Resource.NOTIFICATIONS,
    actions: [Action.READ, Action.UPDATE],
    conditions: { owner: true },
  },

  // Permissões específicas financeiras
  {
    resource: Resource.TRANSACTIONS,
    actions: [Action.READ, Action.CREATE, Action.UPDATE],
  },
  {
    resource: Resource.PAYMENTS,
    actions: [Action.READ, Action.CREATE, Action.UPDATE, Action.APPROVE],
  },
  {
    resource: Resource.FINANCIAL_REPORTS,
    actions: [Action.READ, Action.EXPORT],
  },
  {
    resource: Resource.INVESTMENT_RETURNS,
    actions: [Action.READ, Action.CREATE, Action.UPDATE, Action.APPROVE],
  },
  {
    resource: Resource.REFERRAL_BONUSES,
    actions: [Action.READ, Action.CREATE, Action.UPDATE, Action.APPROVE],
  },
  { resource: Resource.USERS, actions: [Action.READ] },
];

ROLE_PERMISSIONS[UserRole.ADMIN] = [
  // Permissões básicas de usuário
  { resource: Resource.USER_PROFILE, actions: [Action.READ, Action.UPDATE] },
  { resource: Resource.USER_KYC, actions: [Action.READ, Action.UPDATE] },
  { resource: Resource.OPPORTUNITIES, actions: [Action.READ] },
  { resource: Resource.INVESTMENTS, actions: [Action.READ, Action.CREATE] },
  {
    resource: Resource.SUPPORT_TICKETS,
    actions: [Action.READ, Action.CREATE],
    conditions: { owner: true },
  },
  { resource: Resource.REFERRALS, actions: [Action.READ] },
  {
    resource: Resource.REFERRAL_BONUSES,
    actions: [Action.READ],
    conditions: { owner: true },
  },
  { resource: Resource.LOTTERIES, actions: [Action.READ] },
  {
    resource: Resource.LOTTERY_PARTICIPANTS,
    actions: [Action.READ, Action.CREATE],
    conditions: { owner: true },
  },
  {
    resource: Resource.NOTIFICATIONS,
    actions: [Action.READ, Action.UPDATE],
    conditions: { owner: true },
  },

  // Permissões de suporte
  {
    resource: Resource.SUPPORT_TICKETS,
    actions: [Action.READ, Action.UPDATE, Action.ASSIGN],
  },
  {
    resource: Resource.SUPPORT_RESPONSES,
    actions: [Action.CREATE, Action.READ, Action.UPDATE],
  },
  {
    resource: Resource.SYSTEM_NOTIFICATIONS,
    actions: [Action.CREATE, Action.READ],
  },

  // Permissões financeiras
  {
    resource: Resource.TRANSACTIONS,
    actions: [Action.READ, Action.CREATE, Action.UPDATE],
  },
  {
    resource: Resource.PAYMENTS,
    actions: [Action.READ, Action.CREATE, Action.UPDATE, Action.APPROVE],
  },
  {
    resource: Resource.FINANCIAL_REPORTS,
    actions: [Action.READ, Action.EXPORT],
  },
  {
    resource: Resource.INVESTMENT_RETURNS,
    actions: [Action.READ, Action.CREATE, Action.UPDATE, Action.APPROVE],
  },

  // Permissões específicas de admin
  {
    resource: Resource.OPPORTUNITIES,
    actions: [
      Action.CREATE,
      Action.READ,
      Action.UPDATE,
      Action.DELETE,
      Action.APPROVE,
      Action.REJECT,
    ],
  },
  {
    resource: Resource.OPPORTUNITY_DOCUMENTS,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
  },
  {
    resource: Resource.USERS,
    actions: [Action.READ, Action.UPDATE, Action.DELETE],
  },
  {
    resource: Resource.USER_KYC,
    actions: [Action.READ, Action.APPROVE, Action.REJECT],
  },
  {
    resource: Resource.LOTTERIES,
    actions: [Action.CREATE, Action.READ, Action.UPDATE, Action.DELETE],
  },
  {
    resource: Resource.LOTTERY_PARTICIPANTS,
    actions: [Action.READ, Action.UPDATE, Action.DELETE],
  },
  { resource: Resource.AUDIT_LOGS, actions: [Action.READ, Action.EXPORT] },
];

// Função para verificar se um usuário tem permissão
export function hasPermission(
  userRole: UserRole,
  resource: Resource,
  action: Action,
  context?: { userId?: string; ownerId?: string; [key: string]: any }
): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole];

  const permission = rolePermissions.find(p => p.resource === resource);
  if (!permission) return false;

  if (!permission.actions.includes(action)) return false;

  // Verificar condições específicas
  if (permission.conditions) {
    if (permission.conditions.owner && context?.userId !== context?.ownerId) {
      return false;
    }
  }

  return true;
}

// Função para obter todas as permissões de um role
export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Função para verificar se um role é hierarquicamente superior
export function isRoleHigherThan(role1: UserRole, role2: UserRole): boolean {
  const hierarchy = {
    [UserRole.USER]: 0,
    [UserRole.SUPPORT]: 1,
    [UserRole.FINANCIAL]: 1,
    [UserRole.ADMIN]: 2,
  };

  return hierarchy[role1] > hierarchy[role2];
}

// Função para validar se um usuário pode gerenciar outro usuário
export function canManageUser(
  managerRole: UserRole,
  targetRole: UserRole
): boolean {
  return (
    isRoleHigherThan(managerRole, targetRole) || managerRole === UserRole.ADMIN
  );
}
