import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema de validação para atribuição
const AssignmentSchema = z.object({
  ticketIds: z.array(z.string()).min(1, 'Pelo menos um ticket deve ser selecionado'),
  assignedTo: z.string().optional(),
  autoAssign: z.boolean().default(false),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
});

// POST - Atribuir tickets (manual ou automático)
export const POST = withAuth(
  async (request: NextRequest, user) => {
    try {
      const body = await request.json();
      const { ticketIds, assignedTo, autoAssign, priority } = AssignmentSchema.parse(body);

      // Verificar se os tickets existem
      const tickets = await prisma.supportTicket.findMany({
        where: {
          id: { in: ticketIds },
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

      if (tickets.length !== ticketIds.length) {
        return NextResponse.json(
          { error: 'Alguns tickets não foram encontrados' },
          { status: 404 }
        );
      }

      let targetAgentId: string | null = null;
      let assignmentMethod = 'manual';
      let agent: { id: string; firstName: string; lastName: string; role: string; email?: string } | null = null;

      if (autoAssign) {
        // Lógica de atribuição automática
        targetAgentId = await getNextAvailableAgent(priority);
        assignmentMethod = 'automatic';

        if (!targetAgentId) {
          return NextResponse.json(
            { error: 'Nenhum agente disponível para atribuição automática' },
            { status: 400 }
          );
        }

        // Buscar dados do agente atribuído automaticamente
        agent = await prisma.user.findUnique({
          where: { id: targetAgentId },
          select: { id: true, firstName: true, lastName: true, role: true, email: true },
        });
      } else {
        // Atribuição manual
        if (!assignedTo) {
          return NextResponse.json(
            { error: 'ID do agente é obrigatório para atribuição manual' },
            { status: 400 }
          );
        }

        // Verificar se o agente existe e tem permissão
        agent = await prisma.user.findUnique({
          where: { id: assignedTo },
          select: { id: true, firstName: true, lastName: true, role: true, email: true },
        });

        if (!agent) {
          return NextResponse.json(
            { error: 'Agente não encontrado' },
            { status: 404 }
          );
        }

        targetAgentId = assignedTo;
      }

        if (!['ADMIN', 'SUPER_ADMIN', 'SUPPORT'].includes(agent.role)) {
          return NextResponse.json(
            { error: 'Usuário não tem permissão para ser agente de suporte' },
            { status: 400 }
          );
        }

        targetAgentId = assignedTo;
      }

      // Buscar informações do agente
      const agent = await prisma.user.findUnique({
        where: { id: targetAgentId! },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      // Atualizar tickets
      const updatedTickets = await Promise.all(
        tickets.map(async (ticket) => {
          const updatedTicket = await prisma.supportTicket.update({
            where: { id: ticket.id },
            data: {
              assignedTo: targetAgentId,
              status: ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status,
              updatedAt: new Date(),
            },
          });

          // Adicionar mensagem automática
          if (agent) {
            await prisma.ticketMessage.create({
              data: {
                ticketId: ticket.id,
                message: `Ticket atribuído para ${agent.firstName} ${agent.lastName} (${assignmentMethod === 'automatic' ? 'atribuição automática' : 'atribuição manual'}) por ${user.firstName} ${user.lastName}`,
                isFromUser: false,
                authorId: user.id,
              },
            });
          }

          return updatedTicket;
        })
      );

      // Log de auditoria para cada ticket
      await Promise.all(
        tickets.map(async (ticket) => {
          await logResourceEvent(
            AuditEventType.RESOURCE_UPDATE,
            Resource.SUPPORT_TICKETS,
            Action.UPDATE,
            user.id,
            user.email,
            user.role,
            ticket.id,
            true,
            {
              action: 'assign_ticket',
              assignmentMethod,
              ticketSubject: ticket.subject,
              previousAssignedTo: ticket.assignedTo,
              newAssignedTo: targetAgentId,
              agentName: agent ? `${agent.firstName} ${agent.lastName}` : 'Agente não encontrado',
              autoAssign,
            },
            {
              ip: (request as any).ip || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown',
            }
          );
        })
      );

      return NextResponse.json({
        message: agent
          ? `${tickets.length} ticket(s) atribuído(s) com sucesso para ${agent.firstName} ${agent.lastName}`
          : `${tickets.length} ticket(s) processado(s)`,
        assignment: agent ? {
          method: assignmentMethod,
          agent: {
            id: agent.id,
            name: `${agent.firstName} ${agent.lastName}`,
            email: agent.email,
            role: agent.role,
          },
          ticketsCount: tickets.length,
          ticketIds: updatedTickets.map(t => t.id),
        } : null,
        tickets: updatedTickets.map(ticket => ({
          id: ticket.id,
          status: ticket.status,
          assignedTo: ticket.assignedTo,
          updatedAt: ticket.updatedAt,
        })),
      });

    } catch (error) {
      console.error('Ticket assignment error:', error);
      
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

// GET - Obter agentes disponíveis para atribuição
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      // Buscar todos os agentes de suporte
      const agents = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
        },
      });

      // Calcular estatísticas de carga de trabalho para cada agente
      const agentStats = await Promise.all(
        agents.map(async (agent) => {
          const [openTickets, totalTickets, avgResolutionTime] = await Promise.all([
            // Tickets abertos atribuídos ao agente
            prisma.supportTicket.count({
              where: {
                assignedTo: agent.id,
                status: { in: ['OPEN', 'IN_PROGRESS'] },
              },
            }),
            
            // Total de tickets atribuídos (últimos 30 dias)
            prisma.supportTicket.count({
              where: {
                assignedTo: agent.id,
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
            }),
            
            // Tempo médio de resolução (últimos 30 dias)
            prisma.supportTicket.findMany({
              where: {
                assignedTo: agent.id,
                status: { in: ['RESOLVED', 'CLOSED'] },
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
              select: {
                createdAt: true,
                updatedAt: true,
              },
            }),
          ]);

          // Calcular tempo médio de resolução
          const resolutionTimes = avgResolutionTime.map(ticket => 
            new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime()
          );
          const avgResolutionHours = resolutionTimes.length > 0 
            ? Math.round(resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length / (1000 * 60 * 60))
            : 0;

          return {
            id: agent.id,
            name: `${agent.firstName} ${agent.lastName}`,
            email: agent.email,
            role: agent.role,
            workload: {
              openTickets,
              totalTickets,
              avgResolutionHours,
              availability: openTickets < 10 ? 'available' : openTickets < 20 ? 'busy' : 'overloaded',
            },
          };
        })
      );

      // Ordenar por disponibilidade (menos tickets abertos primeiro)
      agentStats.sort((a, b) => a.workload.openTickets - b.workload.openTickets);

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
          action: 'list_available_agents',
          agentsCount: agents.length,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        agents: agentStats,
        summary: {
          totalAgents: agents.length,
          availableAgents: agentStats.filter(a => a.workload.availability === 'available').length,
          busyAgents: agentStats.filter(a => a.workload.availability === 'busy').length,
          overloadedAgents: agentStats.filter(a => a.workload.availability === 'overloaded').length,
        },
      });

    } catch (error) {
      console.error('Get available agents error:', error);
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

// Função auxiliar para atribuição automática
async function getNextAvailableAgent(priority?: string): Promise<string | null> {
  // Buscar agentes de suporte ativos
  const agents = await prisma.user.findMany({
    where: {
      role: { in: ['ADMIN', 'SUPER_ADMIN', 'SUPPORT'] },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  });

  if (agents.length === 0) {
    return null;
  }

  // Calcular carga de trabalho atual de cada agente
  const agentWorkloads = await Promise.all(
    agents.map(async (agent) => {
      const openTickets = await prisma.supportTicket.count({
        where: {
          assignedTo: agent.id,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
        },
      });

      const urgentTickets = await prisma.supportTicket.count({
        where: {
          assignedTo: agent.id,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          priority: 'URGENT',
        },
      });

      return {
        agentId: agent.id,
        openTickets,
        urgentTickets,
        // Peso baseado na carga de trabalho
        weight: openTickets + (urgentTickets * 2),
      };
    })
  );

  // Para tickets urgentes, priorizar agentes com menos tickets urgentes
  if (priority === 'URGENT') {
    agentWorkloads.sort((a, b) => a.urgentTickets - b.urgentTickets || a.openTickets - b.openTickets);
  } else {
    // Para outros tickets, usar round-robin baseado na carga total
    agentWorkloads.sort((a, b) => a.weight - b.weight);
  }

  return agentWorkloads[0].agentId;
}
