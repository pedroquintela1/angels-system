import { z } from 'zod';
import { UserRole, Resource, Action } from '@/lib/permissions';

// Tipos de eventos de auditoria
export enum AuditEventType {
  // Autenticação
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  
  // Autorização
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_CHANGE = 'PERMISSION_CHANGE',
  ROLE_CHANGE = 'ROLE_CHANGE',
  
  // Operações CRUD
  RESOURCE_CREATE = 'RESOURCE_CREATE',
  RESOURCE_READ = 'RESOURCE_READ',
  RESOURCE_UPDATE = 'RESOURCE_UPDATE',
  RESOURCE_DELETE = 'RESOURCE_DELETE',
  
  // Operações financeiras
  INVESTMENT_CREATE = 'INVESTMENT_CREATE',
  INVESTMENT_UPDATE = 'INVESTMENT_UPDATE',
  PAYMENT_PROCESS = 'PAYMENT_PROCESS',
  TRANSACTION_CREATE = 'TRANSACTION_CREATE',
  
  // Operações administrativas
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_ACTIVATE = 'USER_ACTIVATE',
  USER_DEACTIVATE = 'USER_DEACTIVATE',
  
  // KYC
  KYC_SUBMIT = 'KYC_SUBMIT',
  KYC_APPROVE = 'KYC_APPROVE',
  KYC_REJECT = 'KYC_REJECT',
  
  // Oportunidades
  OPPORTUNITY_CREATE = 'OPPORTUNITY_CREATE',
  OPPORTUNITY_UPDATE = 'OPPORTUNITY_UPDATE',
  OPPORTUNITY_DELETE = 'OPPORTUNITY_DELETE',
  OPPORTUNITY_APPROVE = 'OPPORTUNITY_APPROVE',
  OPPORTUNITY_REJECT = 'OPPORTUNITY_REJECT',
  
  // Sistema
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  DATA_EXPORT = 'DATA_EXPORT',
  BULK_OPERATION = 'BULK_OPERATION',
  
  // Segurança
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
}

// Níveis de severidade
export enum AuditSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// Schema para validação de eventos de auditoria
export const AuditEventSchema = z.object({
  eventType: z.nativeEnum(AuditEventType),
  severity: z.nativeEnum(AuditSeverity).default(AuditSeverity.MEDIUM),
  userId: z.string().uuid().optional(),
  userEmail: z.string().email().optional(),
  userRole: z.nativeEnum(UserRole).optional(),
  resource: z.nativeEnum(Resource).optional(),
  action: z.nativeEnum(Action).optional(),
  resourceId: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
  metadata: z.object({
    ip: z.string().optional(),
    userAgent: z.string().optional(),
    sessionId: z.string().optional(),
    requestId: z.string().optional(),
    timestamp: z.date().default(() => new Date()),
  }).optional(),
  success: z.boolean().default(true),
  errorMessage: z.string().optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

// Interface para o logger de auditoria
export interface AuditLogger {
  log(event: AuditEvent): Promise<void>;
  query(filters: AuditQueryFilters): Promise<AuditEvent[]>;
  export(filters: AuditQueryFilters): Promise<string>;
}

// Filtros para consulta de logs
export interface AuditQueryFilters {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  eventType?: AuditEventType;
  severity?: AuditSeverity;
  resource?: Resource;
  success?: boolean;
  limit?: number;
  offset?: number;
}

// Implementação do logger de auditoria
class AuditLoggerImpl implements AuditLogger {
  private logs: AuditEvent[] = []; // Em produção, usar banco de dados
  
  async log(event: AuditEvent): Promise<void> {
    try {
      // Validar evento com try/catch para evitar erros do Zod
      let validatedEvent: AuditEvent;

      try {
        // Verificar se o evento tem a estrutura básica necessária
        if (!event || typeof event !== 'object') {
          throw new Error('Evento inválido');
        }

        validatedEvent = AuditEventSchema.parse(event);
      } catch (zodError) {
        console.warn('Erro na validação Zod, usando evento sem validação:', zodError);
        // Usar evento sem validação como fallback
        validatedEvent = {
          ...event,
          severity: event.severity || AuditSeverity.MEDIUM,
          metadata: {
            ...event.metadata,
            timestamp: new Date(),
          },
        };
      }

      // Adicionar metadados automáticos se ainda não existirem
      if (!validatedEvent.metadata) {
        validatedEvent.metadata = {
          timestamp: new Date(),
        };
      }

      validatedEvent.metadata = {
        ...validatedEvent.metadata,
        timestamp: new Date(),
      };
      
      // Em desenvolvimento, apenas log no console
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 AUDIT LOG:', {
          type: validatedEvent.eventType,
          severity: validatedEvent.severity,
          user: validatedEvent.userEmail || validatedEvent.userId,
          resource: validatedEvent.resource,
          action: validatedEvent.action,
          success: validatedEvent.success,
          timestamp: validatedEvent.metadata.timestamp,
          details: validatedEvent.details,
        });
      }
      
      // Armazenar em memória (temporário)
      this.logs.push(validatedEvent);
      
      // TODO: Em produção, salvar no banco de dados
      // await prisma.auditLog.create({
      //   data: {
      //     eventType: validatedEvent.eventType,
      //     severity: validatedEvent.severity,
      //     userId: validatedEvent.userId,
      //     userEmail: validatedEvent.userEmail,
      //     userRole: validatedEvent.userRole,
      //     resource: validatedEvent.resource,
      //     action: validatedEvent.action,
      //     resourceId: validatedEvent.resourceId,
      //     details: validatedEvent.details,
      //     metadata: validatedEvent.metadata,
      //     success: validatedEvent.success,
      //     errorMessage: validatedEvent.errorMessage,
      //     timestamp: validatedEvent.metadata.timestamp,
      //   },
      // });
      
      // Alertas para eventos críticos
      if (validatedEvent.severity === AuditSeverity.CRITICAL) {
        await this.sendCriticalAlert(validatedEvent);
      }
      
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Não falhar a operação principal por causa de erro de auditoria
    }
  }
  
  async query(filters: AuditQueryFilters): Promise<AuditEvent[]> {
    // Em produção, usar query no banco de dados
    let filteredLogs = [...this.logs];
    
    if (filters.startDate) {
      filteredLogs = filteredLogs.filter(log => 
        log.metadata?.timestamp && log.metadata.timestamp >= filters.startDate!
      );
    }
    
    if (filters.endDate) {
      filteredLogs = filteredLogs.filter(log => 
        log.metadata?.timestamp && log.metadata.timestamp <= filters.endDate!
      );
    }
    
    if (filters.userId) {
      filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
    }
    
    if (filters.eventType) {
      filteredLogs = filteredLogs.filter(log => log.eventType === filters.eventType);
    }
    
    if (filters.severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === filters.severity);
    }
    
    if (filters.resource) {
      filteredLogs = filteredLogs.filter(log => log.resource === filters.resource);
    }
    
    if (filters.success !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.success === filters.success);
    }
    
    // Ordenar por timestamp (mais recente primeiro)
    filteredLogs.sort((a, b) => {
      const timeA = a.metadata?.timestamp?.getTime() || 0;
      const timeB = b.metadata?.timestamp?.getTime() || 0;
      return timeB - timeA;
    });
    
    // Aplicar paginação
    const offset = filters.offset || 0;
    const limit = filters.limit || 100;
    
    return filteredLogs.slice(offset, offset + limit);
  }
  
  async export(filters: AuditQueryFilters): Promise<string> {
    const logs = await this.query(filters);
    
    // Converter para CSV
    const headers = [
      'Timestamp',
      'Event Type',
      'Severity',
      'User Email',
      'User Role',
      'Resource',
      'Action',
      'Success',
      'IP Address',
      'Details',
    ];
    
    const rows = logs.map(log => [
      log.metadata?.timestamp?.toISOString() || '',
      log.eventType,
      log.severity,
      log.userEmail || '',
      log.userRole || '',
      log.resource || '',
      log.action || '',
      log.success ? 'Yes' : 'No',
      log.metadata?.ip || '',
      JSON.stringify(log.details || {}),
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');
    
    return csvContent;
  }
  
  private async sendCriticalAlert(event: AuditEvent): Promise<void> {
    // TODO: Implementar alertas críticos (email, Slack, etc.)
    console.error('🚨 CRITICAL SECURITY EVENT:', {
      type: event.eventType,
      user: event.userEmail,
      details: event.details,
      timestamp: event.metadata?.timestamp,
    });
  }
}

// Instância singleton do logger
export const auditLogger: AuditLogger = new AuditLoggerImpl();

// Funções de conveniência para logging
export async function logAuthEvent(
  eventType: AuditEventType,
  userId?: string,
  userEmail?: string,
  success: boolean = true,
  details?: Record<string, any>,
  metadata?: { ip?: string; userAgent?: string }
): Promise<void> {
  await auditLogger.log({
    eventType,
    severity: success ? AuditSeverity.LOW : AuditSeverity.MEDIUM,
    userId,
    userEmail,
    success,
    details,
    metadata: metadata ? { ...metadata, timestamp: new Date() } : { timestamp: new Date() },
  });
}

export async function logResourceEvent(
  eventType: AuditEventType,
  resource: Resource,
  action: Action,
  userId: string,
  userEmail: string,
  userRole: UserRole,
  resourceId?: string,
  success: boolean = true,
  details?: Record<string, any>,
  metadata?: { ip?: string; userAgent?: string }
): Promise<void> {
  const severity = getSeverityForResourceAction(resource, action);
  
  await auditLogger.log({
    eventType,
    severity,
    userId,
    userEmail,
    userRole,
    resource,
    action,
    resourceId,
    success,
    details,
    metadata: metadata ? { ...metadata, timestamp: new Date() } : { timestamp: new Date() },
  });
}

export async function logSecurityEvent(
  eventType: AuditEventType,
  severity: AuditSeverity,
  userId?: string,
  userEmail?: string,
  details?: Record<string, any>,
  metadata?: { ip?: string; userAgent?: string }
): Promise<void> {
  await auditLogger.log({
    eventType,
    severity,
    userId,
    userEmail,
    success: false,
    details,
    metadata: metadata ? { ...metadata, timestamp: new Date() } : { timestamp: new Date() },
  });
}

// Determinar severidade baseada no recurso e ação
function getSeverityForResourceAction(resource: Resource, action: Action): AuditSeverity {
  // Recursos críticos
  const criticalResources = [
    Resource.USERS,
    Resource.TRANSACTIONS,
    Resource.PAYMENTS,
    Resource.SYSTEM_SETTINGS,
  ];
  
  // Ações críticas
  const criticalActions = [Action.DELETE, Action.APPROVE, Action.REJECT];
  
  if (criticalResources.includes(resource) && criticalActions.includes(action)) {
    return AuditSeverity.CRITICAL;
  }
  
  if (criticalResources.includes(resource) || criticalActions.includes(action)) {
    return AuditSeverity.HIGH;
  }
  
  if (action === Action.CREATE || action === Action.UPDATE) {
    return AuditSeverity.MEDIUM;
  }
  
  return AuditSeverity.LOW;
}
