import { UserRole, TicketStatus, InvestmentStatus, TransactionStatus, TransactionType } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Cache simples em memória (em produção, usar Redis)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  cache.delete(key);
  return null;
}

function setCachedData(key: string, data: any) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Check if user has admin access
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SUPPORT, UserRole.FINANCIAL];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    // Verificar cache
    const cacheKey = 'admin-dashboard-data';
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      console.log('Retornando dados do cache');
      return NextResponse.json(cachedData);
    }

    console.log('Buscando dados do banco...');

    // Executar queries em paralelo para melhor performance
    const [
      // Stats básicas
      totalUsers,
      activeUsers,
      totalInvestments,
      monthlyRevenue,
      pendingTickets,
      activeOpportunities,
      
      // Tickets recentes
      recentTickets,
      
      // Oportunidades recentes
      recentOpportunities,
      
      // Top oportunidades
      topOpportunities,
      
      // Transações recentes
      recentTransactions,
      
      // Dados para gráficos
      userGrowthData,
      investmentGrowthData,
    ] = await Promise.all([
      // Stats queries otimizadas
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.userInvestment.aggregate({ _sum: { amount: true } }),
      prisma.transaction.aggregate({
        where: {
          type: TransactionType.MEMBERSHIP_PAYMENT,
          status: TransactionStatus.COMPLETED,
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
      prisma.supportTicket.count({
        where: { status: { in: [TicketStatus.OPEN, TicketStatus.IN_PROGRESS] } }
      }),
      prisma.investmentOpportunity.count({
        where: { status: InvestmentStatus.ACTIVE }
      }),

      // Tickets recentes com dados do usuário
      prisma.supportTicket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),

      // Oportunidades recentes
      prisma.investmentOpportunity.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { investments: true },
          },
        },
      }),

      // Top oportunidades por valor
      prisma.investmentOpportunity.findMany({
        take: 5,
        orderBy: { currentAmount: 'desc' },
        include: {
          _count: {
            select: { investments: true },
          },
        },
      }),

      // Transações recentes
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      }),

      // Crescimento de usuários (últimos 7 dias)
      prisma.user.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _count: true,
      }),

      // Crescimento de investimentos (últimos 7 dias)
      prisma.userInvestment.groupBy({
        by: ['investedAt'],
        where: {
          investedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    // Formatar dados de resposta
    const dashboardData = {
      stats: {
        totalUsers,
        activeUsers,
        totalInvestments: totalInvestments._sum.amount || 0,
        monthlyRevenue: monthlyRevenue._sum.amount || 0,
        pendingTickets,
        activeOpportunities,
      },
      recentTickets: recentTickets.map(ticket => ({
        id: ticket.id,
        subject: ticket.subject,
        user: `${ticket.user.firstName} ${ticket.user.lastName}`,
        userEmail: ticket.user.email,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString(),
      })),
      recentOpportunities: recentOpportunities.map(opportunity => ({
        id: opportunity.id,
        title: opportunity.title,
        targetAmount: opportunity.targetAmount,
        currentAmount: opportunity.currentAmount,
        status: opportunity.status,
        investorsCount: opportunity._count.investments,
        progress: (opportunity.currentAmount / opportunity.targetAmount) * 100,
        createdAt: opportunity.createdAt.toISOString(),
      })),
      topOpportunities: topOpportunities.map(opportunity => ({
        id: opportunity.id,
        title: opportunity.title,
        currentAmount: opportunity.currentAmount,
        investorsCount: opportunity._count.investments,
        status: opportunity.status,
      })),
      recentTransactions: recentTransactions.map(transaction => ({
        id: transaction.id,
        user: `${transaction.user.firstName} ${transaction.user.lastName}`,
        userEmail: transaction.user.email,
        type: transaction.type,
        status: transaction.status,
        amount: transaction.amount,
        description: transaction.description,
        createdAt: transaction.createdAt.toISOString(),
      })),
      charts: {
        userGrowth: userGrowthData.map(item => ({
          date: item.createdAt.toISOString().split('T')[0],
          count: item._count,
        })),
        investmentGrowth: investmentGrowthData.map(item => ({
          date: item.investedAt.toISOString().split('T')[0],
          amount: item._sum.amount || 0,
        })),
      },
    };

    // Salvar no cache
    setCachedData(cacheKey, dashboardData);

    return NextResponse.json(dashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
