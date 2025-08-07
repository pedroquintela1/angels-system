import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { logResourceEvent } from '@/lib/audit';
import { z } from 'zod';

const BulkStatusSchema = z.object({
  ticketIds: z.array(z.string().uuid()),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
});

export const POST = withAuth(
  async (request: NextRequest, user) => {
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
      await logResourceEvent({
        eventType: 'RESOURCE_UPDATE',
        severity: 'MEDIUM',
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        resource: 'support_tickets',
        action: 'bulk_status_change',
        resourceId: ticketIds.join(','),
        success: true,
        details: {
          ticketIds,
          newStatus: status,
          updatedCount: updatedTickets.count,
          previousStatuses: existingTickets.map(t => ({ id: t.id, status: t.status })),
          adminAction: true
        }
      });

      return NextResponse.json({
        success: true,
        message: `Status de ${updatedTickets.count} ticket(s) alterado(s) com sucesso`,
        updatedCount: updatedTickets.count
      });

    } catch (error) {
      console.error('Erro na alteração de status em lote:', error);

      // Log de erro
      await logResourceEvent({
        eventType: 'RESOURCE_UPDATE',
        severity: 'HIGH',
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        resource: 'support_tickets',
        action: 'bulk_status_change',
        success: false,
        details: {
          error: error instanceof Error ? error.message : 'Erro desconhecido',
          adminAction: true
        }
      });

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
    requiredRole: 'SUPPORT',
    resource: 'support_tickets',
    action: 'update'
  }
);
