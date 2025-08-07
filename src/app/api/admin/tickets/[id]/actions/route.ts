import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para ações
const ActionSchema = z.object({
  action: z.enum(['assign', 'unassign', 'resolve', 'close', 'reopen', 'escalate']),
  assignedTo: z.string().optional(),
  message: z.string().max(1000, 'Mensagem muito longa').optional(),
  reason: z.string().max(500, 'Motivo muito longo').optional(),
});

// POST - Executar ações específicas no ticket
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const ticketId = pathSegments[pathSegments.length - 2]; // -2 porque o último é 'actions'
      const body = await request.json();
      const { action, assignedTo, message, reason } = ActionSchema.parse(body);

      if (!ticketId) {
        return NextResponse.json(
          { error: 'ID do ticket é obrigatório' },
          { status: 400 }
        );
      }

      // Buscar ticket atual
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket não encontrado' },
          { status: 404 }
        );
      }

      let updateData: any = {};
      let auditEventType: AuditEventType = AuditEventType.RESOURCE_UPDATE;
      let successMessage: string;
      let systemMessage: string;

      // Determinar ação e validações
      switch (action) {
        case 'assign':
          if (!assignedTo) {
            return NextResponse.json(
              { error: 'ID do agente é obrigatório para atribuição' },
              { status: 400 }
            );
          }
          
          // Verificar se o agente existe
          const agent = await prisma.user.findUnique({
            where: { id: assignedTo },
            select: { id: true, firstName: true, lastName: true, role: true },
          });
          
          if (!agent) {
            return NextResponse.json(
              { error: 'Agente não encontrado' },
              { status: 404 }
            );
          }
          
          if (!['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(agent.role)) {
            return NextResponse.json(
              { error: 'Usuário não tem permissão para ser agente de suporte' },
              { status: 400 }
            );
          }
          
          updateData.assignedTo = assignedTo;
          updateData.status = ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status;
          successMessage = `Ticket atribuído para ${agent.firstName} ${agent.lastName}`;
          systemMessage = `Ticket atribuído para ${agent.firstName} ${agent.lastName} por ${user.firstName} ${user.lastName}`;
          break;

        case 'unassign':
          if (!ticket.assignedTo) {
            return NextResponse.json(
              { error: 'Ticket não está atribuído' },
              { status: 400 }
            );
          }
          
          updateData.assignedTo = null;
          updateData.status = 'OPEN';
          successMessage = 'Ticket desatribuído com sucesso';
          systemMessage = `Ticket desatribuído por ${user.firstName} ${user.lastName}`;
          break;

        case 'resolve':
          if (!['OPEN', 'IN_PROGRESS'].includes(ticket.status)) {
            return NextResponse.json(
              { error: 'Apenas tickets abertos ou em progresso podem ser resolvidos' },
              { status: 400 }
            );
          }
          
          updateData.status = 'RESOLVED';
          successMessage = 'Ticket marcado como resolvido';
          systemMessage = `Ticket resolvido por ${user.firstName} ${user.lastName}`;
          if (reason) {
            systemMessage += `\nMotivo: ${reason}`;
          }
          break;

        case 'close':
          if (ticket.status === 'CLOSED') {
            return NextResponse.json(
              { error: 'Ticket já está fechado' },
              { status: 400 }
            );
          }
          
          updateData.status = 'CLOSED';
          successMessage = 'Ticket fechado com sucesso';
          systemMessage = `Ticket fechado por ${user.firstName} ${user.lastName}`;
          if (reason) {
            systemMessage += `\nMotivo: ${reason}`;
          }
          break;

        case 'reopen':
          if (!['RESOLVED', 'CLOSED'].includes(ticket.status)) {
            return NextResponse.json(
              { error: 'Apenas tickets resolvidos ou fechados podem ser reabertos' },
              { status: 400 }
            );
          }
          
          updateData.status = ticket.assignedTo ? 'IN_PROGRESS' : 'OPEN';
          successMessage = 'Ticket reaberto com sucesso';
          systemMessage = `Ticket reaberto por ${user.firstName} ${user.lastName}`;
          if (reason) {
            systemMessage += `\nMotivo: ${reason}`;
          }
          break;

        case 'escalate':
          if (ticket.priority === 'URGENT') {
            return NextResponse.json(
              { error: 'Ticket já está na prioridade máxima' },
              { status: 400 }
            );
          }
          
          const priorityOrder = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
          const currentIndex = priorityOrder.indexOf(ticket.priority);
          const newPriority = priorityOrder[Math.min(currentIndex + 1, priorityOrder.length - 1)];
          
          updateData.priority = newPriority;
          updateData.status = ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status;
          successMessage = `Ticket escalado para prioridade ${newPriority}`;
          systemMessage = `Ticket escalado de ${ticket.priority} para ${newPriority} por ${user.firstName} ${user.lastName}`;
          if (reason) {
            systemMessage += `\nMotivo: ${reason}`;
          }
          break;

        default:
          return NextResponse.json(
            { error: 'Ação inválida' },
            { status: 400 }
          );
      }

      // Atualizar ticket
      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      // Adicionar mensagem do usuário se fornecida
      if (message) {
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticketId,
            message: message,
            isFromUser: false,
            authorId: user.id,
          },
        });
      }

      // Adicionar mensagem automática da ação
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticketId,
          message: systemMessage,
          isFromUser: false,
          authorId: user.id,
        },
      });

      // Log de auditoria
      await logResourceEvent(
        auditEventType,
        Resource.SUPPORT_TICKETS,
        Action.UPDATE,
        user.id,
        user.email,
        user.role,
        ticketId,
        true,
        {
          ticketSubject: ticket.subject,
          action,
          previousStatus: ticket.status,
          newStatus: updatedTicket.status,
          previousPriority: ticket.priority,
          newPriority: updatedTicket.priority,
          previousAssignedTo: ticket.assignedTo,
          newAssignedTo: updatedTicket.assignedTo,
          reason,
          hasMessage: !!message,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        message: successMessage,
        ticket: {
          id: updatedTicket.id,
          subject: updatedTicket.subject,
          status: updatedTicket.status,
          priority: updatedTicket.priority,
          assignedTo: updatedTicket.assignedTo,
          updatedAt: updatedTicket.updatedAt,
          isOpen: ['OPEN', 'IN_PROGRESS'].includes(updatedTicket.status),
        },
        action: {
          type: action,
          reason,
          message,
          executedBy: {
            id: user.id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            role: user.role,
          },
          executedAt: new Date(),
        },
      });

    } catch (error) {
      console.error('Admin ticket action error:', error);
      
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
  }
);
