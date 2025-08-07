import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middleware/auth';
import { UserRole, Resource, Action, ROLE_PERMISSIONS, getRolePermissions } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

// Schema para validação de entrada
const GetPermissionsSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  resource: z.nativeEnum(Resource).optional(),
});

const UpdateUserRoleSchema = z.object({
  userId: z.string().uuid(),
  newRole: z.nativeEnum(UserRole),
  reason: z.string().min(10).max(500),
});

/**
 * GET /api/admin/permissions
 * Listar permissões do sistema
 */
export const GET = withAuth(
  async (request: NextRequest) => {
    try {
      const { searchParams } = new URL(request.url);
      const queryParams = {
        role: searchParams.get('role'),
        resource: searchParams.get('resource'),
      };
      
      const validatedParams = GetPermissionsSchema.parse(queryParams);
      
      // Se role específico foi solicitado
      if (validatedParams.role) {
        const rolePermissions = getRolePermissions(validatedParams.role);
        
        return NextResponse.json({
          role: validatedParams.role,
          permissions: rolePermissions,
        });
      }
      
      // Se recurso específico foi solicitado
      if (validatedParams.resource) {
        const resourcePermissions: Record<UserRole, Action[]> = {} as any;
        
        Object.entries(ROLE_PERMISSIONS).forEach(([role, permissions]) => {
          const resourcePermission = permissions.find(p => p.resource === validatedParams.resource);
          if (resourcePermission) {
            resourcePermissions[role as UserRole] = resourcePermission.actions;
          }
        });
        
        return NextResponse.json({
          resource: validatedParams.resource,
          rolePermissions: resourcePermissions,
        });
      }
      
      // Retornar todas as permissões
      const allPermissions = Object.entries(ROLE_PERMISSIONS).map(([role, permissions]) => ({
        role: role as UserRole,
        permissions,
        permissionCount: permissions.length,
        resourceCount: [...new Set(permissions.map(p => p.resource))].length,
      }));
      
      return NextResponse.json({
        roles: allPermissions,
        summary: {
          totalRoles: Object.keys(UserRole).length,
          totalResources: Object.keys(Resource).length,
          totalActions: Object.keys(Action).length,
        },
      });
      
    } catch (error) {
      console.error('Get permissions error:', error);
      
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
    resource: Resource.SYSTEM_SETTINGS,
    action: Action.READ,
    allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  }
);

/**
 * POST /api/admin/permissions/users/role
 * Atualizar role de um usuário
 */
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json();
      const validatedData = UpdateUserRoleSchema.parse(body);
      
      // Verificar se o usuário alvo existe
      const targetUser = await prisma.user.findUnique({
        where: { id: validatedData.userId },
        select: { id: true, email: true, role: true, name: true },
      });
      
      if (!targetUser) {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }
      
      // Verificar se o usuário atual pode gerenciar o usuário alvo
      const currentUserRole = user.role as UserRole;
      const targetUserRole = targetUser.role as UserRole;
      const newRole = validatedData.newRole;
      
      // Super Admin pode alterar qualquer role
      if (currentUserRole !== UserRole.SUPER_ADMIN) {
        // Admin pode alterar roles menores que o seu
        if (currentUserRole === UserRole.ADMIN) {
          const restrictedRoles = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
          if (restrictedRoles.includes(targetUserRole) || restrictedRoles.includes(newRole)) {
            return NextResponse.json(
              { error: 'Não é possível alterar este nível de acesso' },
              { status: 403 }
            );
          }
        } else {
          return NextResponse.json(
            { error: 'Permissão insuficiente para alterar roles' },
            { status: 403 }
          );
        }
      }
      
      // Atualizar role do usuário
      const updatedUser = await prisma.user.update({
        where: { id: validatedData.userId },
        data: { role: validatedData.newRole },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          updatedAt: true,
        },
      });
      
      // Log da alteração (implementar quando modelo AuditLog existir)
      console.log('Role change:', {
        adminId: user.id,
        adminEmail: user.email,
        targetUserId: validatedData.userId,
        targetUserEmail: targetUser.email,
        oldRole: targetUserRole,
        newRole: validatedData.newRole,
        reason: validatedData.reason,
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json({
        message: 'Role atualizado com sucesso',
        user: updatedUser,
        changes: {
          oldRole: targetUserRole,
          newRole: validatedData.newRole,
          changedBy: user.email,
          reason: validatedData.reason,
        },
      });
      
    } catch (error) {
      console.error('Update user role error:', error);
      
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: error.errors },
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
    action: Action.UPDATE,
    allowedRoles: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
  }
);
