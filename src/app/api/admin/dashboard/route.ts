import { UserRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Get system statistics
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({
      where: { isActive: true },
    });

    const totalInvestments = await prisma.userInvestment.aggregate({
      _sum: { amount: true },
    });

    const monthlyRevenue = await prisma.transaction.aggregate({
      where: {
        type: 'MEMBERSHIP_PAYMENT',
        status: 'COMPLETED',
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
    });

    const pendingTickets = await prisma.supportTicket.count({
      where: {
        status: {
          in: ['OPEN', 'IN_PROGRESS'],
        },
      },
    });

    const activeOpportunities = await prisma.investmentOpportunity.count({
      where: { status: 'ACTIVE' },
    });

    // Get recent tickets
    const recentTickets = await prisma.supportTicket.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get recent opportunities
    const recentOpportunities = await prisma.investmentOpportunity.findMany({
      include: {
        investments: {
          select: {
            amount: true,
          },
        },
        _count: {
          select: {
            investments: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get user growth data (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const userGrowth = await prisma.user.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      _count: true,
    });

    // Get investment volume by month
    const investmentVolume = await prisma.userInvestment.groupBy({
      by: ['investedAt'],
      where: {
        investedAt: {
          gte: sixMonthsAgo,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get top performing opportunities
    const topOpportunities = await prisma.investmentOpportunity.findMany({
      include: {
        investments: {
          select: {
            amount: true,
          },
        },
        _count: {
          select: {
            investments: true,
          },
        },
      },
      orderBy: {
        currentAmount: 'desc',
      },
      take: 5,
    });

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return NextResponse.json({
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
        createdAt: ticket.createdAt,
      })),
      recentOpportunities: recentOpportunities.map(opp => ({
        id: opp.id,
        title: opp.title,
        targetAmount: opp.targetAmount,
        currentAmount: opp.currentAmount,
        status: opp.status,
        investorsCount: opp._count.investments,
        progress: (opp.currentAmount / opp.targetAmount) * 100,
        createdAt: opp.createdAt,
      })),
      topOpportunities: topOpportunities.map(opp => ({
        id: opp.id,
        title: opp.title,
        currentAmount: opp.currentAmount,
        investorsCount: opp._count.investments,
        status: opp.status,
      })),
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        status: tx.status,
        user: `${tx.user.firstName} ${tx.user.lastName}`,
        createdAt: tx.createdAt,
      })),
      charts: {
        userGrowth: userGrowth.map(item => ({
          date: item.createdAt,
          count: item._count,
        })),
        investmentVolume: investmentVolume.map(item => ({
          date: item.investedAt,
          amount: item._sum.amount || 0,
        })),
      },
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Admin dashboard API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
