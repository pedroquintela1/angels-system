import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/auth';
import { UserRole, Resource, Action, getRolePermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

// Schema para filtros de usuários
const GetUsersSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  role: z.nativeEnum(UserRole).optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  kycStatus: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
});

/**
 * GET /api/admin/users
 * Listar usuários com informações de permissões
 */
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryParams = Object.fromEntries(searchParams.entries());
      
      const {
        page,
        limit,
        role,
        search,
        isActive,
        kycStatus,
      } = GetUsersSchema.parse(queryParams);
      
      // Construir filtros para a query
      const where: any = {};
      
      if (role) {
        where.role = role;
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      
      if (isActive !== undefined) {
        where.isActive = isActive;
      }
      
      if (kycStatus) {
        where.kycStatus = kycStatus;
      }
      
      // Calcular offset para paginação
      const offset = (page - 1) * limit;
      
      // Buscar usuários com contagem total
      const [users, totalCount] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
            kycStatus: true,
            createdAt: true,
            updatedAt: true,
            lastLoginAt: true,
            // Incluir estatísticas relacionadas se necessário
            _count: {
              select: {
                investments: true,
                // supportTickets: true, // Quando modelo existir
                // referrals: true, // Quando modelo existir
              },
            },
          },
          orderBy: [
            { isActive: 'desc' },
            { createdAt: 'desc' },
          ],
          skip: offset,
          take: limit,
        }),
        prisma.user.count({ where }),
      ]);
      
      // Enriquecer dados dos usuários com informações de permissões
      const enrichedUsers = users.map(user => {
        const userRole = user.role as UserRole;
        const permissions = getRolePermissions(userRole);
        
        return {
          ...user,
          roleInfo: {
            name: getRoleName(userRole),
            level: getRoleLevel(userRole),
            permissions: permissions.length,
            resources: [...new Set(permissions.map(p => p.resource))].length,
          },
          stats: {
            investments: user._count.investments,
            // supportTickets: user._count.supportTickets || 0,
            // referrals: user._count.referrals || 0,
          },
        };
      });
      
      // Calcular metadados de paginação
      const totalPages = Math.ceil(totalCount / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;
      
      return NextResponse.json({
        users: enrichedUsers,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          limit,
          hasNextPage,
          hasPreviousPage,
        },
        summary: {
          totalUsers: totalCount,
          activeUsers: users.filter(u => u.isActive).length,
          roleDistribution: getRoleDistribution(users),
          kycDistribution: getKycDistribution(users),
        },
      });
      
    } catch (error) {
      console.error('Get users error:', error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Parâmetros inválidos', details: error.errors },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.USERS,
    action: Action.READ,
    allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT],
  }
);

// Funções auxiliares
function getRoleName(role: UserRole): string {
  const roleNames = {
    [UserRole.USER]: 'Usuário',
    [UserRole.SUPPORT]: 'Suporte',
    [UserRole.FINANCIAL]: 'Financeiro',
    [UserRole.ADMIN]: 'Administrador',
    [UserRole.SUPER_ADMIN]: 'Super Administrador',
  };
  
  return roleNames[role] || 'Desconhecido';
}

function getRoleLevel(role: UserRole): number {
  const roleLevels = {
    [UserRole.USER]: 1,
    [UserRole.SUPPORT]: 2,
    [UserRole.FINANCIAL]: 2,
    [UserRole.ADMIN]: 3,
    [UserRole.SUPER_ADMIN]: 4,
  };
  
  return roleLevels[role] || 0;
}

function getRoleDistribution(users: any[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  users.forEach(user => {
    const roleName = getRoleName(user.role as UserRole);
    distribution[roleName] = (distribution[roleName] || 0) + 1;
  });
  
  return distribution;
}

function getKycDistribution(users: any[]): Record<string, number> {
  const distribution: Record<string, number> = {
    PENDING: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  
  users.forEach(user => {
    const status = user.kycStatus || 'PENDING';
    distribution[status] = (distribution[status] || 0) + 1;
  });
  
  return distribution;
}
