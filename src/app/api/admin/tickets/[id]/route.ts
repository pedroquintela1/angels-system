import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para atualização de ticket
const UpdateTicketSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().nullable().optional(),
  message: z.string().min(5, 'Mensagem deve ter pelo menos 5 caracteres').max(1000, 'Mensagem muito longa').optional(),
});

// GET - Buscar ticket específico (Admin)
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const ticketId = pathSegments[pathSegments.length - 1];

      if (!ticketId) {
        return NextResponse.json(
          { error: 'ID do ticket é obrigatório' },
          { status: 400 }
        );
      }

      // Buscar ticket com todos os dados
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
          messages: {
            select: {
              id: true,
              message: true,
              isFromUser: true,
              authorId: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
          _count: {
            select: {
              messages: true,
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

      // Buscar informações dos autores das mensagens (agentes)
      const agentIds = ticket.messages
        .filter(msg => !msg.isFromUser && msg.authorId)
        .map(msg => msg.authorId) as string[];
      
      const agents = agentIds.length > 0 ? await prisma.user.findMany({
        where: {
          id: { in: agentIds },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      }) : [];

      const agentsMap = agents.reduce((acc, agent) => {
        acc[agent.id] = agent;
        return acc;
      }, {} as Record<string, any>);

      // Buscar informações do agente atribuído
      const assignedAgent = ticket.assignedTo ? await prisma.user.findUnique({
        where: { id: ticket.assignedTo },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      }) : null;

      // Processar mensagens
      const processedMessages = ticket.messages.map(msg => {
        let authorName = 'Sistema';
        
        if (msg.isFromUser) {
          authorName = `${ticket.user.firstName} ${ticket.user.lastName}`;
        } else if (msg.authorId && agentsMap[msg.authorId]) {
          const agent = agentsMap[msg.authorId];
          authorName = `${agent.firstName} ${agent.lastName}`;
        }
        
        return {
          id: msg.id,
          message: msg.message,
          isFromUser: msg.isFromUser,
          authorId: msg.authorId,
          authorName,
          createdAt: msg.createdAt,
        };
      });

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.RESOURCE_READ,
        Resource.SUPPORT_TICKETS,
        Action.READ,
        user.id,
        user.email,
        user.role,
        ticketId,
        true,
        {
          ticketSubject: ticket.subject,
          ticketStatus: ticket.status,
          ticketPriority: ticket.priority,
          messagesCount: ticket._count.messages,
          adminView: true,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          assignedTo: ticket.assignedTo,
          createdAt: ticket.createdAt,
          updatedAt: ticket.updatedAt,
          
          // Dados do usuário
          user: {
            id: ticket.user.id,
            name: `${ticket.user.firstName} ${ticket.user.lastName}`,
            email: ticket.user.email,
            role: ticket.user.role,
            memberSince: ticket.user.createdAt,
          },
          
          // Dados do agente atribuído
          assignedAgent: assignedAgent ? {
            id: assignedAgent.id,
            name: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
            email: assignedAgent.email,
            role: assignedAgent.role,
          } : null,
          
          // Estatísticas
          messagesCount: ticket._count.messages,
          isOpen: ['OPEN', 'IN_PROGRESS'].includes(ticket.status),
          canUpdate: true,
          isUnassigned: !ticket.assignedTo,
          
          // Tempo desde criação
          ageInHours: Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)),
          
          // Mensagens completas
          messages: processedMessages,
        },
      });

    } catch (error) {
      console.error('Admin ticket detail error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.SUPPORT_TICKETS,
    action: Action.READ,
    requireAuth: true,
    ownershipCheck: false,
  }
);

// PUT - Atualizar ticket (Admin)
export const PUT = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const ticketId = pathSegments[pathSegments.length - 1];
      const body = await request.json();
      const validatedData = UpdateTicketSchema.parse(body);

      if (!ticketId) {
        return NextResponse.json(
          { error: 'ID do ticket é obrigatório' },
          { status: 400 }
        );
      }

      // Buscar ticket atual
      const existingTicket = await prisma.supportTicket.findUnique({
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

      if (!existingTicket) {
        return NextResponse.json(
          { error: 'Ticket não encontrado' },
          { status: 404 }
        );
      }

      // Preparar dados para atualização
      const updateData: any = {};
      const changes: string[] = [];
      
      if (validatedData.status && validatedData.status !== existingTicket.status) {
        updateData.status = validatedData.status;
        changes.push(`Status: ${existingTicket.status} → ${validatedData.status}`);
      }
      
      if (validatedData.priority && validatedData.priority !== existingTicket.priority) {
        updateData.priority = validatedData.priority;
        changes.push(`Prioridade: ${existingTicket.priority} → ${validatedData.priority}`);
      }
      
      if (validatedData.assignedTo !== undefined && validatedData.assignedTo !== existingTicket.assignedTo) {
        updateData.assignedTo = validatedData.assignedTo;
        const oldAgent = existingTicket.assignedTo || 'Não atribuído';
        const newAgent = validatedData.assignedTo || 'Não atribuído';
        changes.push(`Atribuição: ${oldAgent} → ${newAgent}`);
      }

      // Atualizar ticket se houver mudanças
      let updatedTicket = existingTicket;
      if (Object.keys(updateData).length > 0) {
        updatedTicket = await prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            ...updateData,
            updatedAt: new Date(),
          },
        });
      }

      // Adicionar mensagem se fornecida
      let newMessage = null;
      if (validatedData.message) {
        newMessage = await prisma.ticketMessage.create({
          data: {
            ticketId: ticketId,
            message: validatedData.message,
            isFromUser: false,
            authorId: user.id,
          },
        });
      }

      // Adicionar mensagem automática sobre mudanças
      if (changes.length > 0) {
        await prisma.ticketMessage.create({
          data: {
            ticketId: ticketId,
            message: `Ticket atualizado por ${user.firstName} ${user.lastName}:\n${changes.join('\n')}`,
            isFromUser: false,
            authorId: user.id,
          },
        });
      }

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.RESOURCE_UPDATE,
        Resource.SUPPORT_TICKETS,
        Action.UPDATE,
        user.id,
        user.email,
        user.role,
        ticketId,
        true,
        {
          ticketSubject: existingTicket.subject,
          changes,
          hasMessage: !!validatedData.message,
          previousStatus: existingTicket.status,
          newStatus: updatedTicket.status,
          previousPriority: existingTicket.priority,
          newPriority: updatedTicket.priority,
          previousAssignedTo: existingTicket.assignedTo,
          newAssignedTo: updatedTicket.assignedTo,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        ticket: {
          id: updatedTicket.id,
          subject: updatedTicket.subject,
          status: updatedTicket.status,
          priority: updatedTicket.priority,
          assignedTo: updatedTicket.assignedTo,
          updatedAt: updatedTicket.updatedAt,
          isOpen: ['OPEN', 'IN_PROGRESS'].includes(updatedTicket.status),
        },
        message: newMessage ? {
          id: newMessage.id,
          message: newMessage.message,
          isFromUser: newMessage.isFromUser,
          authorId: newMessage.authorId,
          authorName: `${user.firstName} ${user.lastName}`,
          createdAt: newMessage.createdAt,
        } : null,
        changes,
        success: 'Ticket atualizado com sucesso!',
      });

    } catch (error) {
      console.error('Admin ticket update error:', error);
      
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
