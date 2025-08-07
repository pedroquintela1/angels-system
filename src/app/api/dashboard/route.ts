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

    const userId = session.user.id;

    // Get user with membership
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        membership: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Get user investments with opportunities
    const investments = await prisma.userInvestment.findMany({
      where: { userId },
      include: {
        opportunity: true,
        returns: true,
      },
    });

    // Calculate totals
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturns = investments.reduce((sum, inv) => 
      sum + inv.returns.reduce((returnSum, ret) => returnSum + ret.userReturnAmount, 0), 0
    );
    const activeInvestments = investments.filter(inv => 
      inv.opportunity.status === 'ACTIVE'
    ).length;

    // Get recent transactions
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get available opportunities (not invested by user)
    const investedOpportunityIds = investments.map(inv => inv.opportunityId);
    const availableOpportunities = await prisma.investmentOpportunity.findMany({
      where: {
        status: 'ACTIVE',
        id: {
          notIn: investedOpportunityIds,
        },
      },
      take: 3,
      orderBy: { createdAt: 'desc' },
    });

    // Get recent notifications
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get referral stats
    const referralCount = await prisma.user.count({
      where: { referredBy: userId },
    });

    const referralBonus = await prisma.transaction.aggregate({
      where: {
        userId,
        type: 'REFERRAL_BONUS',
        status: 'COMPLETED',
      },
      _sum: {
        amount: true,
      },
    });

    return NextResponse.json({
      user: {
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        kycStatus: user.kycStatus,
        referralCode: user.referralCode,
      },
      membership: {
        status: user.membership?.status || 'INACTIVE',
        nextPaymentDate: user.membership?.nextPaymentDate,
        monthlyFee: user.membership?.monthlyFee || 20,
      },
      stats: {
        totalInvested,
        totalReturns,
        activeInvestments,
        referralCount,
        referralBonus: referralBonus._sum.amount || 0,
      },
      investments: investments.map(inv => ({
        id: inv.id,
        amount: inv.amount,
        investedAt: inv.investedAt,
        opportunity: {
          id: inv.opportunity.id,
          title: inv.opportunity.title,
          status: inv.opportunity.status,
          targetAmount: inv.opportunity.targetAmount,
          currentAmount: inv.opportunity.currentAmount,
        },
        returns: inv.returns.map(ret => ({
          amount: ret.userReturnAmount,
          percentage: ret.returnPercentage,
          distributedAt: ret.distributedAt,
        })),
      })),
      availableOpportunities: availableOpportunities.map(opp => ({
        id: opp.id,
        title: opp.title,
        description: opp.description,
        targetAmount: opp.targetAmount,
        currentAmount: opp.currentAmount,
        minInvestment: opp.minInvestment,
        endDate: opp.endDate,
        progress: (opp.currentAmount / opp.targetAmount) * 100,
      })),
      recentTransactions: recentTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        description: tx.description,
        status: tx.status,
        createdAt: tx.createdAt,
      })),
      notifications: notifications.map(notif => ({
        id: notif.id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        isRead: notif.isRead,
        createdAt: notif.createdAt,
      })),
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Dashboard API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
