/**
 * Traduções para textos do sistema
 * Centraliza todas as traduções de status, enums e textos da interface
 */

// Status de Membership
export const MEMBERSHIP_STATUS_TRANSLATIONS = {
  ACTIVE: 'Ativo',
  INACTIVE: 'Inativo',
  SUSPENDED: 'Suspenso',
  CANCELLED: 'Cancelado',
} as const;

// Status de KYC
export const KYC_STATUS_TRANSLATIONS = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  UNDER_REVIEW: 'Em Análise',
} as const;

// Status de Investimento
export const INVESTMENT_STATUS_TRANSLATIONS = {
  ACTIVE: 'Ativo',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
  PAUSED: 'Pausado',
} as const;

// Status de Ticket de Suporte
export const TICKET_STATUS_TRANSLATIONS = {
  OPEN: 'Aberto',
  IN_PROGRESS: 'Em Andamento',
  RESOLVED: 'Resolvido',
  CLOSED: 'Fechado',
} as const;

// Prioridade de Ticket
export const TICKET_PRIORITY_TRANSLATIONS = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  URGENT: 'Urgente',
} as const;

// Status de Transação
export const TRANSACTION_STATUS_TRANSLATIONS = {
  PENDING: 'Pendente',
  COMPLETED: 'Concluída',
  FAILED: 'Falhou',
  CANCELLED: 'Cancelada',
  REFUNDED: 'Reembolsada',
} as const;

// Tipos de Transação
export const TRANSACTION_TYPE_TRANSLATIONS = {
  MEMBERSHIP_PAYMENT: 'Pagamento de Mensalidade',
  INVESTMENT: 'Investimento',
  RETURN: 'Retorno',
  REFERRAL_BONUS: 'Bônus de Indicação',
  WITHDRAWAL: 'Saque',
  REFUND: 'Reembolso',
} as const;

// Roles de Usuário (já traduzidos no RoleBadge, mas mantendo aqui para consistência)
export const USER_ROLE_TRANSLATIONS = {
  USER: 'Usuário',
  SUPPORT: 'Suporte',
  FINANCIAL: 'Financeiro',
  ADMIN: 'Admin',
  SUPER_ADMIN: 'Super Admin',
} as const;

// Funções utilitárias para tradução
export function translateMembershipStatus(status: string): string {
  return MEMBERSHIP_STATUS_TRANSLATIONS[status as keyof typeof MEMBERSHIP_STATUS_TRANSLATIONS] || status;
}

export function translateKycStatus(status: string): string {
  return KYC_STATUS_TRANSLATIONS[status as keyof typeof KYC_STATUS_TRANSLATIONS] || status;
}

export function translateInvestmentStatus(status: string): string {
  return INVESTMENT_STATUS_TRANSLATIONS[status as keyof typeof INVESTMENT_STATUS_TRANSLATIONS] || status;
}

export function translateTicketStatus(status: string): string {
  return TICKET_STATUS_TRANSLATIONS[status as keyof typeof TICKET_STATUS_TRANSLATIONS] || status;
}

export function translateTicketPriority(priority: string): string {
  return TICKET_PRIORITY_TRANSLATIONS[priority as keyof typeof TICKET_PRIORITY_TRANSLATIONS] || priority;
}

export function translateTransactionStatus(status: string): string {
  return TRANSACTION_STATUS_TRANSLATIONS[status as keyof typeof TRANSACTION_STATUS_TRANSLATIONS] || status;
}

export function translateTransactionType(type: string): string {
  return TRANSACTION_TYPE_TRANSLATIONS[type as keyof typeof TRANSACTION_TYPE_TRANSLATIONS] || type;
}

export function translateUserRole(role: string): string {
  return USER_ROLE_TRANSLATIONS[role as keyof typeof USER_ROLE_TRANSLATIONS] || role;
}

// Função genérica para traduzir qualquer status
export function translateStatus(status: string, type: 'membership' | 'kyc' | 'investment' | 'ticket' | 'transaction'): string {
  switch (type) {
    case 'membership':
      return translateMembershipStatus(status);
    case 'kyc':
      return translateKycStatus(status);
    case 'investment':
      return translateInvestmentStatus(status);
    case 'ticket':
      return translateTicketStatus(status);
    case 'transaction':
      return translateTransactionStatus(status);
    default:
      return status;
  }
}

// Textos comuns da interface
export const UI_TEXTS = {
  // Loading states
  LOADING: 'Carregando...',
  LOADING_DATA: 'Carregando dados...',
  PROCESSING: 'Processando...',
  SAVING: 'Salvando...',
  SUBMITTING: 'Enviando...',
  
  // Error messages
  ERROR: 'Erro',
  ERROR_LOADING: 'Erro ao carregar dados',
  ERROR_SAVING: 'Erro ao salvar',
  ERROR_UNKNOWN: 'Erro desconhecido',
  ERROR_NETWORK: 'Erro de conexão',
  
  // Success messages
  SUCCESS: 'Sucesso',
  SAVED_SUCCESSFULLY: 'Salvo com sucesso',
  UPDATED_SUCCESSFULLY: 'Atualizado com sucesso',
  CREATED_SUCCESSFULLY: 'Criado com sucesso',
  DELETED_SUCCESSFULLY: 'Excluído com sucesso',
  
  // Common actions
  SAVE: 'Salvar',
  CANCEL: 'Cancelar',
  DELETE: 'Excluir',
  EDIT: 'Editar',
  VIEW: 'Visualizar',
  CREATE: 'Criar',
  UPDATE: 'Atualizar',
  SUBMIT: 'Enviar',
  CONFIRM: 'Confirmar',
  
  // Navigation
  BACK: 'Voltar',
  NEXT: 'Próximo',
  PREVIOUS: 'Anterior',
  HOME: 'Início',
  DASHBOARD: 'Painel',
  
  // Common labels
  NAME: 'Nome',
  EMAIL: 'Email',
  PASSWORD: 'Senha',
  PHONE: 'Telefone',
  DATE: 'Data',
  STATUS: 'Status',
  DESCRIPTION: 'Descrição',
  AMOUNT: 'Valor',
  TOTAL: 'Total',
} as const;
