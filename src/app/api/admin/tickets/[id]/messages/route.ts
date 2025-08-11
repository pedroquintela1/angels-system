import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para nova mensagem
const CreateMessageSchema = z.object({
  message: z.string().min(5, 'Mensagem deve ter pelo menos 5 caracteres').max(2000, 'Mensagem muito longa'),
  isInternal: z.boolean().default(false), // Mensagem interna (apenas para agentes)
  updateStatus: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
});

// Schema de validação para filtros de listagem
const ListMessagesSchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val)),
  limit: z.string().optional().default('50').transform(val => parseInt(val)),
  includeInternal: z.string().optional().default('true').transform(val => val === 'true'),
});

// GET - Listar mensagens do ticket (Admin)
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const ticketId = pathSegments[pathSegments.length - 2]; // -2 porque o último é 'messages'
      const { searchParams } = url;
      
      const filters = {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '50'),
        includeInternal: searchParams.get('includeInternal') !== 'false',
      };

      if (!ticketId) {
        return NextResponse.json(
          { error: 'ID do ticket é obrigatório' },
          { status: 400 }
        );
      }

      // Verificar se o ticket existe
      const ticket = await prisma.supportTicket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          subject: true,
          status: true,
          userId: true,
          assignedTo: true,
        },
      });

      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket não encontrado' },
          { status: 404 }
        );
      }

      // Construir filtros para mensagens
      const where: any = {
        ticketId: ticketId,
      };

      // Se não incluir mensagens internas, filtrar apenas mensagens públicas
      if (!filters.includeInternal) {
        where.isInternal = false;
      }

      // Calcular paginação
      const skip = (filters.page - 1) * filters.limit;

      // Buscar mensagens
      const [messages, total] = await Promise.all([
        prisma.ticketMessage.findMany({
          where,
          select: {
            id: true,
            message: true,
            isFromUser: true,
            isInternal: true,
            authorId: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
          skip,
          take: filters.limit,
        }),
        prisma.ticketMessage.count({ where }),
      ]);

      // Buscar informações dos autores
      const authorIds = messages
        .map(msg => msg.authorId)
        .filter(Boolean) as string[];
      
      const authors = authorIds.length > 0 ? await prisma.user.findMany({
        where: {
          id: { in: authorIds },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      }) : [];

      const authorsMap = authors.reduce((acc, author) => {
        acc[author.id] = author;
        return acc;
      }, {} as Record<string, any>);

      // Buscar informações do usuário do ticket
      const ticketUser = await prisma.user.findUnique({
        where: { id: ticket.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      // Processar mensagens
      const processedMessages = messages.map(msg => {
        let authorInfo = {
          id: 'system',
          name: 'Sistema',
          email: '',
          role: 'SYSTEM',
        };

        if (msg.isFromUser && ticketUser) {
          authorInfo = {
            id: ticketUser.id,
            name: `${ticketUser.firstName} ${ticketUser.lastName}`,
            email: ticketUser.email,
            role: 'USER',
          };
        } else if (!msg.isFromUser && msg.authorId && authorsMap[msg.authorId]) {
          const author = authorsMap[msg.authorId];
          authorInfo = {
            id: author.id,
            name: `${author.firstName} ${author.lastName}`,
            email: author.email,
            role: author.role,
          };
        }

        return {
          id: msg.id,
          message: msg.message,
          isFromUser: msg.isFromUser,
          isInternal: msg.isInternal || false,
          createdAt: msg.createdAt,
          author: authorInfo,
          canEdit: !msg.isFromUser && msg.authorId === user.id, // Agente pode editar suas próprias mensagens
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
          action: 'list_messages',
          ticketSubject: ticket.subject,
          messagesCount: messages.length,
          includeInternal: filters.includeInternal,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        messages: processedMessages,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
          hasNext: filters.page * filters.limit < total,
          hasPrev: filters.page > 1,
        },
        ticket: {
          id: ticket.id,
          subject: ticket.subject,
          status: ticket.status,
          assignedTo: ticket.assignedTo,
          canAddMessage: ['OPEN', 'IN_PROGRESS'].includes(ticket.status),
        },
        filters: {
          includeInternal: filters.includeInternal,
        },
      });

    } catch (error) {
      console.error('Admin ticket messages list error:', error);
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

// POST - Adicionar nova mensagem (Admin)
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Extrair ID da URL
      const url = new URL(request.url);
      const pathSegments = url.pathname.split('/');
      const ticketId = pathSegments[pathSegments.length - 2]; // -2 porque o último é 'messages'
      const body = await request.json();
      const validatedData = CreateMessageSchema.parse(body);

      if (!ticketId) {
        return NextResponse.json(
          { error: 'ID do ticket é obrigatório' },
          { status: 400 }
        );
      }

      // Verificar se o ticket existe
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

      // Verificar se o ticket ainda aceita mensagens (exceto para mensagens internas)
      if (!validatedData.isInternal && !['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(ticket.status)) {
        return NextResponse.json(
          { error: 'Não é possível adicionar mensagens públicas a tickets fechados' },
          { status: 400 }
        );
      }

      // Criar mensagem
      const message = await prisma.ticketMessage.create({
        data: {
          ticketId: ticketId,
          message: validatedData.message,
          isFromUser: false,
          isInternal: validatedData.isInternal,
          authorId: user.id,
        },
      });

      // Atualizar status do ticket se solicitado
      let updatedTicket = ticket;
      if (validatedData.updateStatus && validatedData.updateStatus !== ticket.status) {
        updatedTicket = await prisma.supportTicket.update({
          where: { id: ticketId },
          data: {
            status: validatedData.updateStatus,
            updatedAt: new Date(),
          },
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

        // Adicionar mensagem automática sobre mudança de status
        if (!validatedData.isInternal) {
          await prisma.ticketMessage.create({
            data: {
              ticketId: ticketId,
              message: `Status do ticket alterado de ${ticket.status} para ${validatedData.updateStatus} por ${user.name}`,
              isFromUser: false,
              isInternal: false,
              authorId: user.id,
            },
          });
        }
      } else {
        // Apenas atualizar timestamp
        updatedTicket = await prisma.supportTicket.update({
          where: { id: ticketId },
          data: { updatedAt: new Date() },
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
      }

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.RESOURCE_CREATE,
        Resource.SUPPORT_TICKETS,
        Action.CREATE,
        user.id,
        user.email,
        user.role,
        ticketId,
        true,
        {
          action: 'add_message',
          ticketSubject: ticket.subject,
          messageLength: validatedData.message.length,
          isInternal: validatedData.isInternal,
          statusChanged: validatedData.updateStatus !== undefined,
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
          isInternal: message.isInternal,
          authorId: message.authorId,
          createdAt: message.createdAt,
          author: {
            id: user.id,
            name: `${user.name}`,
            email: user.email,
            role: user.role,
          },
          canEdit: true,
        },
        ticket: {
          id: updatedTicket.id,
          status: updatedTicket.status,
          updatedAt: updatedTicket.updatedAt,
          canAddMessage: ['OPEN', 'IN_PROGRESS', 'RESOLVED'].includes(updatedTicket.status),
        },
        success: validatedData.isInternal 
          ? 'Nota interna adicionada com sucesso!' 
          : 'Mensagem enviada com sucesso!',
      });

    } catch (error) {
      console.error('Admin ticket message creation error:', error);
      
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
    action: Action.CREATE,
    requireAuth: true,
    ownershipCheck: false,
  }
);
