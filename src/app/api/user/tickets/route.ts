import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para criação de ticket
const CreateTicketSchema = z.object({
  subject: z.string().min(5, 'Assunto deve ter pelo menos 5 caracteres').max(200, 'Assunto muito longo'),
  description: z.string().min(20, 'Descrição deve ter pelo menos 20 caracteres').max(2000, 'Descrição muito longa'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
});

// Schema de validação para filtros de listagem
const ListTicketsSchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val)),
  limit: z.string().optional().default('20').transform(val => parseInt(val)),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// GET - Listar tickets do usuário
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const filters = {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
        status: searchParams.get('status') as any,
        priority: searchParams.get('priority') as any,
        sortBy: (searchParams.get('sortBy') || 'createdAt') as any,
        sortOrder: (searchParams.get('sortOrder') || 'desc') as any,
      };

      // Construir filtros do Prisma
      const where: any = {
        userId: user.id, // Usuário só vê seus próprios tickets
      };
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.priority) {
        where.priority = filters.priority;
      }

      // Calcular paginação
      const skip = (filters.page - 1) * filters.limit;

      // Buscar tickets do usuário
      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
          include: {
            messages: {
              select: {
                id: true,
                message: true,
                isFromUser: true,
                authorId: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 3, // Últimas 3 mensagens para preview
            },
            _count: {
              select: {
                messages: true,
              },
            },
          },
          orderBy: {
            [filters.sortBy]: filters.sortOrder,
          },
          skip,
          take: filters.limit,
        }),
        prisma.supportTicket.count({ where }),
      ]);

      // Processar dados dos tickets
      const processedTickets = tickets.map(ticket => ({
        id: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        assignedTo: ticket.assignedTo,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
        
        // Estatísticas
        messagesCount: ticket._count.messages,
        hasUnreadMessages: ticket.messages.some(msg => !msg.isFromUser), // Mensagens de agentes
        
        // Preview das últimas mensagens
        recentMessages: ticket.messages.map(msg => ({
          id: msg.id,
          message: msg.message.length > 100 ? msg.message.substring(0, 100) + '...' : msg.message,
          isFromUser: msg.isFromUser,
          createdAt: msg.createdAt,
        })),
        
        // Status visual
        isOpen: ['OPEN', 'IN_PROGRESS'].includes(ticket.status),
        needsAttention: ticket.status === 'OPEN' && ticket.priority === 'URGENT',
      }));

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.RESOURCE_READ,
        Resource.SUPPORT_TICKETS,
        Action.READ,
        user.id,
        user.email,
        user.role,
        undefined,
        true,
        {
          filters,
          resultCount: tickets.length,
          totalCount: total,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        tickets: processedTickets,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total,
          totalPages: Math.ceil(total / filters.limit),
          hasNext: filters.page * filters.limit < total,
          hasPrev: filters.page > 1,
        },
        filters: {
          status: filters.status,
          priority: filters.priority,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        },
        summary: {
          totalTickets: total,
          openTickets: processedTickets.filter(t => t.isOpen).length,
          urgentTickets: processedTickets.filter(t => t.priority === 'URGENT').length,
          unreadMessages: processedTickets.filter(t => t.hasUnreadMessages).length,
        },
      });

    } catch (error) {
      console.error('User tickets list error:', error);
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
    ownershipCheck: true, // Usuário só vê seus próprios tickets
  }
);

// POST - Criar novo ticket
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json();
      const validatedData = CreateTicketSchema.parse(body);

      // Verificar se o usuário não tem muitos tickets abertos
      const openTicketsCount = await prisma.supportTicket.count({
        where: {
          userId: user.id,
          status: {
            in: ['OPEN', 'IN_PROGRESS'],
          },
        },
      });

      if (openTicketsCount >= 5) {
        return NextResponse.json(
          { error: 'Você já possui muitos tickets abertos. Aguarde a resolução dos existentes.' },
          { status: 400 }
        );
      }

      // Criar ticket
      const ticket = await prisma.supportTicket.create({
        data: {
          userId: user.id,
          subject: validatedData.subject,
          description: validatedData.description,
          priority: validatedData.priority,
          status: 'OPEN',
        },
        include: {
          _count: {
            select: {
              messages: true,
            },
          },
        },
      });

      // Criar mensagem inicial com a descrição
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          message: validatedData.description,
          isFromUser: true,
          authorId: user.id,
        },
      });

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.RESOURCE_CREATE,
        Resource.SUPPORT_TICKETS,
        Action.CREATE,
        user.id,
        user.email,
        user.role,
        ticket.id,
        true,
        {
          ticketSubject: ticket.subject,
          priority: ticket.priority,
          status: ticket.status,
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
          messagesCount: 1, // Mensagem inicial
          isOpen: true,
          needsAttention: ticket.priority === 'URGENT',
        },
        message: 'Ticket criado com sucesso! Nossa equipe entrará em contato em breve.',
      }, { status: 201 });

    } catch (error) {
      console.error('User ticket creation error:', error);
      
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
