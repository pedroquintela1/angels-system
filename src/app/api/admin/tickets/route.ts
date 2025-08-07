import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para filtros de listagem
const ListTicketsSchema = z.object({
  page: z.string().optional().default('1').transform(val => parseInt(val)),
  limit: z.string().optional().default('20').transform(val => parseInt(val)),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assignedTo: z.string().optional(),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'status']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// GET - Listar todos os tickets (Admin)
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const filters = {
        page: parseInt(searchParams.get('page') || '1'),
        limit: parseInt(searchParams.get('limit') || '20'),
        status: searchParams.get('status') as any,
        priority: searchParams.get('priority') as any,
        assignedTo: searchParams.get('assignedTo'),
        search: searchParams.get('search'),
        sortBy: (searchParams.get('sortBy') || 'createdAt') as any,
        sortOrder: (searchParams.get('sortOrder') || 'desc') as any,
      };

      // Construir filtros do Prisma
      const where: any = {};
      
      if (filters.status) {
        where.status = filters.status;
      }
      
      if (filters.priority) {
        where.priority = filters.priority;
      }
      
      if (filters.assignedTo) {
        if (filters.assignedTo === 'unassigned') {
          where.assignedTo = null;
        } else {
          where.assignedTo = filters.assignedTo;
        }
      }
      
      if (filters.search) {
        where.OR = [
          { subject: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
          { user: { 
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ]
          }},
        ];
      }

      // Calcular paginação
      const skip = (filters.page - 1) * filters.limit;

      // Buscar tickets
      const [tickets, total] = await Promise.all([
        prisma.supportTicket.findMany({
          where,
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
                createdAt: 'desc',
              },
              take: 2, // Últimas 2 mensagens para preview
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

      // Buscar informações dos agentes atribuídos
      const assignedAgentIds = tickets
        .map(t => t.assignedTo)
        .filter(Boolean) as string[];
      
      const agents = assignedAgentIds.length > 0 ? await prisma.user.findMany({
        where: {
          id: { in: assignedAgentIds },
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

      // Processar dados dos tickets
      const processedTickets = tickets.map(ticket => {
        const assignedAgent = ticket.assignedTo ? agentsMap[ticket.assignedTo] : null;
        
        return {
          id: ticket.id,
          subject: ticket.subject,
          description: ticket.description.length > 150 
            ? ticket.description.substring(0, 150) + '...' 
            : ticket.description,
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
          
          // Dados do agente atribuído
          assignedAgent: assignedAgent ? {
            id: assignedAgent.id,
            name: `${assignedAgent.firstName} ${assignedAgent.lastName}`,
            email: assignedAgent.email,
          } : null,
          
          // Estatísticas
          messagesCount: ticket._count.messages,
          hasUnreadMessages: ticket.messages.some(msg => msg.isFromUser), // Mensagens de usuários
          
          // Preview das últimas mensagens
          recentMessages: ticket.messages.map(msg => ({
            id: msg.id,
            message: msg.message.length > 100 ? msg.message.substring(0, 100) + '...' : msg.message,
            isFromUser: msg.isFromUser,
            createdAt: msg.createdAt,
          })),
          
          // Status visual
          isOpen: ['OPEN', 'IN_PROGRESS'].includes(ticket.status),
          needsAttention: ticket.status === 'OPEN' || (ticket.priority === 'URGENT' && ticket.status !== 'CLOSED'),
          isUnassigned: !ticket.assignedTo,
          
          // Tempo desde criação
          ageInHours: Math.floor((new Date().getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)),
        };
      });

      // Calcular estatísticas gerais
      const stats = {
        total,
        open: processedTickets.filter(t => t.status === 'OPEN').length,
        inProgress: processedTickets.filter(t => t.status === 'IN_PROGRESS').length,
        resolved: processedTickets.filter(t => t.status === 'RESOLVED').length,
        closed: processedTickets.filter(t => t.status === 'CLOSED').length,
        urgent: processedTickets.filter(t => t.priority === 'URGENT').length,
        unassigned: processedTickets.filter(t => t.isUnassigned).length,
        needsAttention: processedTickets.filter(t => t.needsAttention).length,
      };

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
          adminView: true,
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
          assignedTo: filters.assignedTo,
          search: filters.search,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        },
        statistics: stats,
      });

    } catch (error) {
      console.error('Admin tickets list error:', error);
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
