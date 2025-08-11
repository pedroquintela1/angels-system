import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedUser } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { Resource, Action, UserRole } from '@/lib/permissions';
import { z } from 'zod';

const BulkStatusSchema = z.object({
  ticketIds: z.array(z.string().uuid()),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export const POST = withAuth(
  async (request: NextRequest, user: AuthenticatedUser) => {
    try {
      const body = await request.json();
      const { ticketIds, status } = BulkStatusSchema.parse(body);

      // Verificar se o usuário tem permissão para alterar status de tickets
      if (!['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Acesso negado' },
          { status: 403 }
        );
      }

      // Verificar se todos os tickets existem
      const existingTickets = await prisma.supportTicket.findMany({
        where: {
          id: { in: ticketIds }
        },
        select: { id: true, subject: true, status: true }
      });

      if (existingTickets.length !== ticketIds.length) {
        return NextResponse.json(
          { error: 'Um ou mais tickets não foram encontrados' },
          { status: 404 }
        );
      }

      // Atualizar todos os tickets
      const updatedTickets = await prisma.supportTicket.updateMany({
        where: {
          id: { in: ticketIds }
        },
        data: {
          status: status,
          updatedAt: new Date()
        }
      });

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.RESOURCE_UPDATE,
        Resource.SUPPORT_TICKETS,
        Action.UPDATE,
        user.id,
        user.email,
        user.role,
        ticketIds.join(','),
        true,
        {
          ticketIds,
          newStatus: status,
          updatedCount: updatedTickets.count,
          previousStatuses: existingTickets.map(t => ({ id: t.id, status: t.status })),
          adminAction: true,
          timestamp: new Date().toISOString()
        }
      );

      return NextResponse.json({
        success: true,
        message: `Status de ${updatedTickets.count} ticket(s) alterado(s) com sucesso`,
        updatedCount: updatedTickets.count
      });

    } catch (error) {
      console.error('Erro na alteração de status em lote:', error);

      // Log de erro
      await logResourceEvent(
        AuditEventType.RESOURCE_UPDATE,
        Resource.SUPPORT_TICKETS,
        Action.UPDATE,
        user.id,
        user.email,
        user.role,
        'bulk-status-error',
        false,
        {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          adminAction: true,
          timestamp: new Date().toISOString()
        }
      );

      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Dados inválidos', details: error.issues },
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
    resource: Resource.SUPPORT_TICKETS,
    action: Action.UPDATE,
    requireAuth: true,
    ownershipCheck: false,
    allowedRoles: [UserRole.SUPPORT, UserRole.ADMIN, UserRole.SUPER_ADMIN]
  }
);
