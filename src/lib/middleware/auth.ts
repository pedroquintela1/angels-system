import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { UserRole, Resource, Action, hasPermission } from '@/lib/permissions';
import { logSecurityEvent, logResourceEvent, AuditEventType, AuditSeverity } from '@/lib/audit';
import { z } from 'zod';

// Schema para validação de contexto de autorização
const AuthContextSchema = z.object({
  resource: z.nativeEnum(Resource),
  action: z.nativeEnum(Action),
  requireAuth: z.boolean().default(true),
  allowedRoles: z.array(z.nativeEnum(UserRole)).optional(),
  ownershipCheck: z.boolean().default(false),
  customCheck: z.any().optional(), // Função customizada de verificação
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

// Interface para dados do usuário autenticado
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  kycStatus: string;
}

// Resultado da verificação de autorização
export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
}

/**
 * Middleware principal de autorização
 * Verifica autenticação e permissões baseadas em roles
 */
export async function authorize(
  request: NextRequest,
  context: AuthContext
): Promise<AuthResult> {
  try {
    // Validar contexto de entrada
    const validatedContext = AuthContextSchema.parse(context);
    
    // 1. Verificar se autenticação é necessária
    if (!validatedContext.requireAuth) {
      return { success: true };
    }
    
    // 2. Obter sessão do usuário
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return {
        success: false,
        error: 'Não autorizado - sessão inválida',
        statusCode: 401,
      };
    }
    
    // 3. Buscar dados completos do usuário
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        kycStatus: true,
      },
    });
    
    if (!user) {
      return {
        success: false,
        error: 'Usuário não encontrado',
        statusCode: 404,
      };
    }
    
    // 4. Verificar se usuário está ativo
    if (!user.isActive) {
      return {
        success: false,
        error: 'Conta desativada',
        statusCode: 403,
      };
    }
    
    const authenticatedUser: AuthenticatedUser = {
      id: user.id,
      email: user.email,
      name: user.name || '',
      role: user.role as UserRole,
      isActive: user.isActive,
      kycStatus: user.kycStatus || 'PENDING',
    };
    
    // 5. Verificar roles permitidos (se especificado)
    if (validatedContext.allowedRoles && validatedContext.allowedRoles.length > 0) {
      if (!validatedContext.allowedRoles.includes(authenticatedUser.role)) {
        return {
          success: false,
          error: 'Acesso negado - role insuficiente',
          statusCode: 403,
        };
      }
    }
    
    // 6. Verificar permissões baseadas em RBAC
    const hasRequiredPermission = hasPermission(
      authenticatedUser.role,
      validatedContext.resource,
      validatedContext.action
    );
    
    if (!hasRequiredPermission) {
      // Log da tentativa de acesso negado
      await logSecurityEvent(
        AuditEventType.ACCESS_DENIED,
        AuditSeverity.MEDIUM,
        authenticatedUser.id,
        authenticatedUser.email,
        {
          requestedResource: validatedContext.resource,
          requestedAction: validatedContext.action,
          userRole: authenticatedUser.role,
        },
        {
          ip: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return {
        success: false,
        error: 'Acesso negado - permissão insuficiente',
        statusCode: 403,
      };
    }
    
    // 7. Verificação customizada (se fornecida)
    if (validatedContext.customCheck) {
      const customResult = await validatedContext.customCheck(authenticatedUser, request);
      if (!customResult) {
        return {
          success: false,
          error: 'Acesso negado - verificação customizada falhou',
          statusCode: 403,
        };
      }
    }
    
    // 8. Log de acesso autorizado (apenas para ações sensíveis)
    if (isSensitiveAction(validatedContext.resource, validatedContext.action)) {
      await logResourceEvent(
        AuditEventType.ACCESS_GRANTED,
        validatedContext.resource,
        validatedContext.action,
        authenticatedUser.id,
        authenticatedUser.email,
        authenticatedUser.role,
        undefined, // resourceId
        true, // success
        {
          requestPath: request.url,
        },
        {
          ip: request.ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );
    }
    
    return {
      success: true,
      user: authenticatedUser,
    };
    
  } catch (error) {
    console.error('Authorization error:', error);
    return {
      success: false,
      error: 'Erro interno de autorização',
      statusCode: 500,
    };
  }
}

/**
 * Wrapper para facilitar uso em API routes
 */
export function withAuth(
  handler: (request: NextRequest, user: AuthenticatedUser) => Promise<NextResponse>,
  context: AuthContext
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await authorize(request, context);
    
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.statusCode || 500 }
      );
    }
    
    return handler(request, authResult.user!);
  };
}

/**
 * Verificar se uma ação é considerada sensível para auditoria
 */
function isSensitiveAction(resource: Resource, action: Action): boolean {
  const sensitiveActions = [
    Action.CREATE,
    Action.UPDATE,
    Action.DELETE,
    Action.APPROVE,
    Action.REJECT,
  ];
  
  const sensitiveResources = [
    Resource.USERS,
    Resource.OPPORTUNITIES,
    Resource.TRANSACTIONS,
    Resource.PAYMENTS,
    Resource.FINANCIAL_REPORTS,
    Resource.SYSTEM_SETTINGS,
  ];
  
  return sensitiveActions.includes(action) && sensitiveResources.includes(resource);
}



/**
 * Verificar ownership de um recurso
 */
export async function checkOwnership(
  resourceType: Resource,
  resourceId: string,
  userId: string
): Promise<boolean> {
  try {
    switch (resourceType) {
      case Resource.SUPPORT_TICKETS:
        const ticket = await prisma.supportTicket?.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return ticket?.userId === userId;
        
      case Resource.INVESTMENTS:
        const investment = await prisma.investment?.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return investment?.userId === userId;
        
      case Resource.NOTIFICATIONS:
        const notification = await prisma.notification?.findUnique({
          where: { id: resourceId },
          select: { userId: true },
        });
        return notification?.userId === userId;
        
      default:
        return false;
    }
  } catch (error) {
    console.error('Ownership check error:', error);
    return false;
  }
}

/**
 * Middleware específico para verificar KYC
 */
export async function requireKYC(user: AuthenticatedUser): Promise<boolean> {
  return user.kycStatus === 'APPROVED';
}

/**
 * Middleware específico para verificar membership ativo
 */
export async function requireActiveMembership(userId: string): Promise<boolean> {
  try {
    const membership = await prisma.membership?.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
        expiresAt: {
          gt: new Date(),
        },
      },
    });
    
    return !!membership;
  } catch (error) {
    console.error('Membership check error:', error);
    return false;
  }
}
