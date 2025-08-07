import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { prisma } from '@/lib/prisma';
import { logResourceEvent } from '@/lib/audit';
import { z } from 'zod';

const BulkAssignSchema = z.object({
  ticketIds: z.array(z.string().uuid()),
  assignedTo: z.string().uuid().nullable(),
});

export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json();
      const { ticketIds, assignedTo } = BulkAssignSchema.parse(body);

      // Verificar se o usuário tem permissão para atribuir tickets
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
        select: { id: true, subject: true }
      });

      if (existingTickets.length !== ticketIds.length) {
        return NextResponse.json(
          { error: 'Um ou mais tickets não foram encontrados' },
          { status: 404 }
        );
      }

      // Se assignedTo não for null, verificar se o agente existe
      if (assignedTo) {
        const agent = await prisma.user.findUnique({
          where: { id: assignedTo },
          select: { id: true, role: true }
        });

        if (!agent || !['SUPER_ADMIN', 'ADMIN', 'SUPPORT'].includes(agent.role)) {
          return NextResponse.json(
            { error: 'Agente não encontrado ou não tem permissão para receber tickets' },
            { status: 400 }
          );
        }
      }

      // Atualizar todos os tickets
      const updatedTickets = await prisma.supportTicket.updateMany({
        where: {
          id: { in: ticketIds }
        },
        data: {
          assignedTo: assignedTo,
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
        action: 'bulk_assign',
        resourceId: ticketIds.join(','),
        success: true,
        details: {
          ticketIds,
          assignedTo,
          updatedCount: updatedTickets.count,
          adminAction: true
        }
      });

      return NextResponse.json({
        success: true,
        message: `${updatedTickets.count} ticket(s) atribuído(s) com sucesso`,
        updatedCount: updatedTickets.count
      });

    } catch (error) {
      console.error('Erro na atribuição em lote:', error);

      // Log de erro
      await logResourceEvent({
        eventType: 'RESOURCE_UPDATE',
        severity: 'HIGH',
        userId: user.id,
        userEmail: user.email,
        userRole: user.role,
        resource: 'support_tickets',
        action: 'bulk_assign',
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
