import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

// GET - Estatísticas dos tickets (Admin)
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const period = searchParams.get('period') || '30d';
      const agentId = searchParams.get('agentId');

      // Calcular data de início baseada no período
      const now = new Date();
      let startDate: Date | undefined;
      
      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case '1y':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
        default:
          startDate = undefined;
          break;
      }

      // Construir filtros do Prisma
      const where: any = {};
      if (startDate) {
        where.createdAt = { gte: startDate };
      }
      if (agentId) {
        where.assignedTo = agentId;
      }

      // Buscar estatísticas básicas
      const [
        totalTickets,
        ticketsByStatus,
        ticketsByPriority,
        averageResolutionTime,
        agentPerformance,
        recentTickets,
      ] = await Promise.all([
        // Total de tickets
        prisma.supportTicket.count({ where }),
        
        // Tickets por status
        prisma.supportTicket.groupBy({
          by: ['status'],
          where,
          _count: {
            id: true,
          },
        }),
        
        // Tickets por prioridade
        prisma.supportTicket.groupBy({
          by: ['priority'],
          where,
          _count: {
            id: true,
          },
        }),
        
        // Tempo médio de resolução (tickets resolvidos/fechados)
        prisma.supportTicket.findMany({
          where: {
            ...where,
            status: { in: ['RESOLVED', 'CLOSED'] },
          },
          select: {
            createdAt: true,
            updatedAt: true,
          },
        }),
        
        // Performance por agente
        prisma.supportTicket.groupBy({
          by: ['assignedTo'],
          where: {
            ...where,
            assignedTo: { not: null },
          },
          _count: {
            id: true,
          },
        }),
        
        // Tickets recentes (últimos 10)
        prisma.supportTicket.findMany({
          where,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        }),
      ]);

      // Calcular tempo médio de resolução
      const resolutionTimes = averageResolutionTime.map(ticket => 
        new Date(ticket.updatedAt).getTime() - new Date(ticket.createdAt).getTime()
      );
      const avgResolutionTimeMs = resolutionTimes.length > 0 
        ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
        : 0;
      const avgResolutionHours = Math.round(avgResolutionTimeMs / (1000 * 60 * 60));

      // Processar estatísticas por status
      const statusStats = ticketsByStatus.reduce((acc, stat) => {
        acc[stat.status] = stat._count.id;
        return acc;
      }, {} as Record<string, number>);

      // Processar estatísticas por prioridade
      const priorityStats = ticketsByPriority.reduce((acc, stat) => {
        acc[stat.priority] = stat._count.id;
        return acc;
      }, {} as Record<string, number>);

      // Buscar informações dos agentes
      const agentIds = agentPerformance
        .map(perf => perf.assignedTo)
        .filter(Boolean) as string[];
      
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

      // Processar performance dos agentes
      const processedAgentPerformance = agentPerformance.map(perf => {
        const agent = agentsMap[perf.assignedTo!];
        return {
          agentId: perf.assignedTo,
          agentName: agent ? `${agent.firstName} ${agent.lastName}` : 'Agente Desconhecido',
          agentEmail: agent?.email || '',
          ticketsCount: perf._count.id,
        };
      }).sort((a, b) => b.ticketsCount - a.ticketsCount);

      // Processar tickets recentes
      const processedRecentTickets = recentTickets.map(ticket => ({
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        user: {
          name: `${ticket.user.firstName} ${ticket.user.lastName}`,
          email: ticket.user.email,
        },
        ageInHours: Math.floor((now.getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)),
      }));

      // Calcular métricas derivadas
      const openTickets = statusStats.OPEN || 0;
      const inProgressTickets = statusStats.IN_PROGRESS || 0;
      const resolvedTickets = statusStats.RESOLVED || 0;
      const closedTickets = statusStats.CLOSED || 0;
      const urgentTickets = priorityStats.URGENT || 0;
      const unassignedTickets = totalTickets - agentPerformance.reduce((sum, perf) => sum + perf._count.id, 0);

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
          statsType: 'tickets_overview',
          period,
          agentId,
        },
        {
          ip: (request as any).ip || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      );

      return NextResponse.json({
        period,
        generatedAt: now,
        
        // Métricas principais
        overview: {
          totalTickets,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          closedTickets,
          urgentTickets,
          unassignedTickets,
          averageResolutionHours: avgResolutionHours,
        },
        
        // Estatísticas por status
        byStatus: {
          OPEN: statusStats.OPEN || 0,
          IN_PROGRESS: statusStats.IN_PROGRESS || 0,
          RESOLVED: statusStats.RESOLVED || 0,
          CLOSED: statusStats.CLOSED || 0,
        },
        
        // Estatísticas por prioridade
        byPriority: {
          LOW: priorityStats.LOW || 0,
          MEDIUM: priorityStats.MEDIUM || 0,
          HIGH: priorityStats.HIGH || 0,
          URGENT: priorityStats.URGENT || 0,
        },
        
        // Performance dos agentes
        agentPerformance: processedAgentPerformance,
        
        // Tickets recentes
        recentTickets: processedRecentTickets,
        
        // Métricas de performance
        performance: {
          resolutionRate: totalTickets > 0 ? ((resolvedTickets + closedTickets) / totalTickets) * 100 : 0,
          responseRate: totalTickets > 0 ? ((inProgressTickets + resolvedTickets + closedTickets) / totalTickets) * 100 : 0,
          urgentRate: totalTickets > 0 ? (urgentTickets / totalTickets) * 100 : 0,
          assignmentRate: totalTickets > 0 ? ((totalTickets - unassignedTickets) / totalTickets) * 100 : 0,
          averageTicketsPerAgent: processedAgentPerformance.length > 0 
            ? processedAgentPerformance.reduce((sum, agent) => sum + agent.ticketsCount, 0) / processedAgentPerformance.length 
            : 0,
        },
        
        // Alertas
        alerts: {
          highUrgentTickets: urgentTickets > 5,
          highUnassignedTickets: unassignedTickets > 10,
          slowResolution: avgResolutionHours > 48,
          highOpenTickets: openTickets > 20,
        },
      });

    } catch (error) {
      console.error('Admin tickets stats error:', error);
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
