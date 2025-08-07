import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para adicionar mensagem
const AddMessageSchema = z.object({
  message: z.string().min(5, 'Mensagem deve ter pelo menos 5 caracteres').max(1000, 'Mensagem muito longa'),
});

// GET - Buscar ticket específico do usuário
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

      // Buscar ticket com todas as mensagens
      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          userId: user.id, // Usuário só pode ver seus próprios tickets
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
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
      const authorIds = ticket.messages
        .filter(msg => !msg.isFromUser && msg.authorId)
        .map(msg => msg.authorId!)
        .filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicatas

      const authors = authorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: authorIds } },
            select: { id: true, firstName: true, lastName: true },
          })
        : [];

      const authorsMap = authors.reduce((acc, author) => {
        acc[author.id] = author;
        return acc;
      }, {} as Record<string, { firstName: string; lastName: string }>);

      // Processar mensagens
      const processedMessages = ticket.messages.map(msg => {
        let authorName = 'Sistema';

        if (msg.isFromUser) {
          authorName = `${ticket.user.firstName} ${ticket.user.lastName}`;
        } else if (msg.authorId && authorsMap[msg.authorId]) {
          const author = authorsMap[msg.authorId];
          authorName = `${author.firstName} ${author.lastName}`;
        } else if (!msg.isFromUser) {
          authorName = 'Agente de Suporte';
        }

        return {
          id: msg.id,
          message: msg.message,
          isFromUser: msg.isFromUser,
          authorId: msg.authorId,
          createdAt: msg.createdAt,
          author: authorName,
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
          messagesCount: ticket._count.messages,
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
          },
          
          // Estatísticas
          messagesCount: ticket._count.messages,
          isOpen: ['OPEN', 'IN_PROGRESS'].includes(ticket.status),
          canAddMessage: ['OPEN', 'IN_PROGRESS'].includes(ticket.status),
          
          // Mensagens completas
          messages: processedMessages,
        },
      });

    } catch (error) {
      console.error('User ticket detail error:', error);
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
    ownershipCheck: true,
  }
);

// POST - Adicionar mensagem ao ticket
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const ticketId = pathSegments[pathSegments.length - 1];
      const body = await request.json();
      const validatedData = AddMessageSchema.parse(body);

      if (!ticketId) {
        return NextResponse.json(
          { error: 'ID do ticket é obrigatório' },
          { status: 400 }
        );
      }

      // Verificar se o ticket existe e pertence ao usuário
      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          userId: user.id,
        },
      });

      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket não encontrado' },
          { status: 404 }
        );
      }

      // Verificar se o ticket ainda aceita mensagens
      if (!['OPEN', 'IN_PROGRESS'].includes(ticket.status)) {
        return NextResponse.json(
          { error: 'Não é possível adicionar mensagens a tickets fechados ou resolvidos' },
          { status: 400 }
        );
      }

      // Criar mensagem
      const message = await prisma.ticketMessage.create({
        data: {
          ticketId: ticketId,
          message: validatedData.message,
          isFromUser: true,
          authorId: user.id,
        },
      });

      // Atualizar timestamp do ticket
      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { 
          updatedAt: new Date(),
          // Se estava resolvido, reabrir para IN_PROGRESS
          status: ticket.status === 'RESOLVED' ? 'IN_PROGRESS' : ticket.status,
        },
      });

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
          action: 'add_message',
          ticketSubject: ticket.subject,
          messageLength: validatedData.message.length,
          previousStatus: ticket.status,
          newStatus: updatedTicket.status,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        message: {
          id: message.id,
          message: message.message,
          isFromUser: message.isFromUser,
          authorId: message.authorId,
          createdAt: message.createdAt,
          author: `${user.firstName} ${user.lastName}`,
        },
        ticket: {
          id: updatedTicket.id,
          status: updatedTicket.status,
          updatedAt: updatedTicket.updatedAt,
          canAddMessage: ['OPEN', 'IN_PROGRESS'].includes(updatedTicket.status),
        },
        success: 'Mensagem adicionada com sucesso!',
      });

    } catch (error) {
      console.error('User ticket message error:', error);
      
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
    ownershipCheck: true,
  }
);

// PUT - Fechar ticket (usuário pode fechar seus próprios tickets)
export const PUT = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const ticketId = pathSegments[pathSegments.length - 1];
      const body = await request.json();
      const { action } = body;

      if (!ticketId) {
        return NextResponse.json(
          { error: 'ID do ticket é obrigatório' },
          { status: 400 }
        );
      }

      if (action !== 'close') {
        return NextResponse.json(
          { error: 'Ação inválida. Usuários só podem fechar tickets.' },
          { status: 400 }
        );
      }

      // Verificar se o ticket existe e pertence ao usuário
      const ticket = await prisma.supportTicket.findFirst({
        where: {
          id: ticketId,
          userId: user.id,
        },
      });

      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket não encontrado' },
          { status: 404 }
        );
      }

      if (ticket.status === 'CLOSED') {
        return NextResponse.json(
          { error: 'Ticket já está fechado' },
          { status: 400 }
        );
      }

      // Fechar ticket
      const updatedTicket = await prisma.supportTicket.update({
        where: { id: ticketId },
        data: { 
          status: 'CLOSED',
          updatedAt: new Date(),
        },
      });

      // Adicionar mensagem automática de fechamento
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticketId,
          message: 'Ticket fechado pelo usuário.',
          isFromUser: true,
          authorId: user.id,
        },
      });

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
          action: 'close_ticket',
          ticketSubject: ticket.subject,
          previousStatus: ticket.status,
          newStatus: 'CLOSED',
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        ticket: {
          id: updatedTicket.id,
          status: updatedTicket.status,
          updatedAt: updatedTicket.updatedAt,
          isOpen: false,
          canAddMessage: false,
        },
        message: 'Ticket fechado com sucesso!',
      });

    } catch (error) {
      console.error('User ticket close error:', error);
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
    ownershipCheck: true,
  }
);
