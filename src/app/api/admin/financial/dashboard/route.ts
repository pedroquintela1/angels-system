import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30');

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - period);

    // Get current period metrics
    const currentPeriodInvestments = await prisma.userInvestment.aggregate({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        amount: true,
      },
      _count: true,
    });

    // Get previous period for comparison
    const previousPeriodInvestments = await prisma.userInvestment.aggregate({
      where: {
        createdAt: {
          gte: previousStartDate,
          lt: startDate,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get total metrics
    const totalInvestments = await prisma.userInvestment.aggregate({
      _sum: {
        amount: true,
      },
    });

    // Get monthly metrics
    const currentMonth = new Date();
    currentMonth.setDate(1);
    currentMonth.setHours(0, 0, 0, 0);

    const monthlyInvestments = await prisma.userInvestment.aggregate({
      where: {
        createdAt: {
          gte: currentMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Calculate commissions (assuming 5% commission rate)
    const commissionRate = 0.05;
    const totalCommissions =
      (totalInvestments._sum.amount || 0) * commissionRate;
    const monthlyCommissions =
      (monthlyInvestments._sum.amount || 0) * commissionRate;

    // Get active investors count
    const activeInvestors = await prisma.user.count({
      where: {
        investments: {
          some: {},
        },
      },
    });

    // Get pending transactions count
    const pendingTransactions = await prisma.transaction.count({
      where: {
        status: 'PENDING',
      },
    });

    // Calculate growth rates
    const currentAmount = currentPeriodInvestments._sum.amount || 0;
    const previousAmount = previousPeriodInvestments._sum.amount || 0;

    const investmentGrowth =
      previousAmount > 0
        ? ((currentAmount - previousAmount) / previousAmount) * 100
        : 0;

    // Revenue is total investments + commissions
    const totalRevenue = (totalInvestments._sum.amount || 0) + totalCommissions;
    const monthlyRevenue =
      (monthlyInvestments._sum.amount || 0) + monthlyCommissions;

    const currentRevenue = currentAmount + currentAmount * commissionRate;
    const previousRevenue = previousAmount + previousAmount * commissionRate;

    const revenueGrowth =
      previousRevenue > 0
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
        : 0;

    // Get revenue data for chart (last 12 months)
    const revenueData = [];
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthInvestments = await prisma.userInvestment.aggregate({
        where: {
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        _sum: {
          amount: true,
        },
      });

      const investments = monthInvestments._sum.amount || 0;
      const commissions = investments * commissionRate;
      const revenue = investments + commissions;

      revenueData.push({
        month: monthStart.toLocaleDateString('pt-BR', {
          month: 'short',
          year: 'numeric',
        }),
        revenue,
        investments,
        commissions,
      });
    }

    const metrics = {
      totalRevenue,
      monthlyRevenue,
      totalInvestments: totalInvestments._sum.amount || 0,
      monthlyInvestments: monthlyInvestments._sum.amount || 0,
      totalCommissions,
      monthlyCommissions,
      activeInvestors,
      pendingTransactions,
      revenueGrowth,
      investmentGrowth,
    };

    return NextResponse.json({
      metrics,
      revenueData,
    });
  } catch (error) {
    console.error('Financial dashboard API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
