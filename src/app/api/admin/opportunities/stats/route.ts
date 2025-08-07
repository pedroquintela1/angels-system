import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { logResourceEvent, AuditEventType } from '@/lib/audit';
import { prisma } from '@/lib/prisma';

// GET - Estatísticas das oportunidades (Admin)
export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {
      const { searchParams } = new URL(request.url);
      const period = searchParams.get('period') || '30d';
      const status = searchParams.get('status');

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
      if (status) {
        where.status = status;
      }

      // Buscar estatísticas básicas
      const [totalOpportunities, opportunitiesByStatus, totalInvestments, totalInvestedAmount] = await Promise.all([
        // Total de oportunidades
        prisma.investmentOpportunity.count({ where }),
        
        // Oportunidades por status
        prisma.investmentOpportunity.groupBy({
          by: ['status'],
          where,
          _count: {
            id: true,
          },
          _sum: {
            targetAmount: true,
            currentAmount: true,
          },
        }),
        
        // Total de investimentos
        prisma.userInvestment.count({
          where: {
            opportunity: where,
          },
        }),
        
        // Valor total investido
        prisma.userInvestment.aggregate({
          where: {
            opportunity: where,
          },
          _sum: {
            amount: true,
          },
        }),
      ]);

      // Processar estatísticas por status
      const statusStats = opportunitiesByStatus.reduce((acc, stat) => {
        acc[stat.status] = {
          count: stat._count.id,
          totalTarget: stat._sum.targetAmount || 0,
          totalCaptured: stat._sum.currentAmount || 0,
        };
        return acc;
      }, {} as Record<string, any>);

      // Calcular métricas derivadas
      const totalCapturedAmount = totalInvestedAmount._sum.amount || 0;
      const totalTarget = opportunitiesByStatus.reduce((sum, stat) => sum + (stat._sum.targetAmount || 0), 0);
      const overallCompletionRate = totalTarget > 0 ? (totalCapturedAmount / totalTarget) * 100 : 0;
      const averageInvestmentSize = totalInvestments > 0 ? totalCapturedAmount / totalInvestments : 0;

      // Log de auditoria
      await logResourceEvent(
        AuditEventType.RESOURCE_READ,
        Resource.OPPORTUNITIES,
        Action.READ,
        user.id,
        user.email,
        user.role,
        undefined,
        true,
        {
          statsType: 'opportunities_overview',
          period,
          status,
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
          totalOpportunities,
          totalInvestments,
          totalCapturedAmount,
          totalTargetAmount: totalTarget,
          overallCompletionRate,
          averageInvestmentSize,
        },
        
        // Estatísticas por status
        byStatus: {
          DRAFT: statusStats.DRAFT || { count: 0, totalTarget: 0, totalCaptured: 0 },
          ACTIVE: statusStats.ACTIVE || { count: 0, totalTarget: 0, totalCaptured: 0 },
          CLOSED: statusStats.CLOSED || { count: 0, totalTarget: 0, totalCaptured: 0 },
          COMPLETED: statusStats.COMPLETED || { count: 0, totalTarget: 0, totalCaptured: 0 },
          CANCELLED: statusStats.CANCELLED || { count: 0, totalTarget: 0, totalCaptured: 0 },
        },
        
        // Métricas de performance
        performance: {
          successRate: totalOpportunities > 0 ? ((statusStats.COMPLETED?.count || 0) / totalOpportunities) * 100 : 0,
          activeRate: totalOpportunities > 0 ? ((statusStats.ACTIVE?.count || 0) / totalOpportunities) * 100 : 0,
          cancellationRate: totalOpportunities > 0 ? ((statusStats.CANCELLED?.count || 0) / totalOpportunities) * 100 : 0,
          averageTargetAmount: totalOpportunities > 0 ? totalTarget / totalOpportunities : 0,
          averageCapturedAmount: totalOpportunities > 0 ? totalCapturedAmount / totalOpportunities : 0,
        },
      });

    } catch (error) {
      console.error('Admin opportunities stats error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.OPPORTUNITIES,
    action: Action.READ,
    requireAuth: true,
    ownershipCheck: false,
  }
);
