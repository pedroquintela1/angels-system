import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

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

    // Buscar investimentos do usuário
    const investments = await prisma.userInvestment.findMany({
      where: {
        userId: session.user.id,
      },
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            targetAmount: true,
            currentAmount: true,
            startDate: true,
            endDate: true,
          },
        },
        returns: {
          select: {
            id: true,
            userReturnAmount: true,
            returnPercentage: true,
            distributedAt: true,
          },
          orderBy: {
            distributedAt: 'desc',
          },
        },
      },
      orderBy: {
        investedAt: 'desc',
      },
    });

    // Calcular estatísticas
    const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalReturns = investments.reduce((sum, inv) =>
      sum + inv.returns.reduce((returnSum: number, ret) => returnSum + ret.userReturnAmount, 0), 0
    );
    const activeInvestments = investments.filter(inv => inv.opportunity.status === 'ACTIVE').length;
    const completedInvestments = investments.filter(inv => inv.opportunity.status === 'COMPLETED').length;
    const totalProfitLoss = totalReturns - totalInvested;
    const totalProfitLossPercentage = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    // Processar dados dos investimentos
    const processedInvestments = investments.map(investment => {
      const totalReturnsForInvestment = investment.returns.reduce((sum, ret) => sum + ret.userReturnAmount, 0);
      const currentValue = investment.amount + totalReturnsForInvestment;
      const profitLoss = totalReturnsForInvestment;
      const profitLossPercentage = investment.amount > 0 ? (profitLoss / investment.amount) * 100 : 0;

      return {
        id: investment.id,
        amount: investment.amount,
        investedAt: investment.investedAt,
        opportunity: {
          id: investment.opportunity.id,
          title: investment.opportunity.title,
          description: investment.opportunity.description,
          status: investment.opportunity.status,
          targetAmount: investment.opportunity.targetAmount,
          currentAmount: investment.opportunity.currentAmount,
          startDate: investment.opportunity.startDate,
          endDate: investment.opportunity.endDate,
        },
        returns: investment.returns.map(ret => ({
          id: ret.id,
          amount: ret.userReturnAmount,
          percentage: ret.returnPercentage,
          distributedAt: ret.distributedAt,
        })),
        totalReturns: totalReturnsForInvestment,
        currentValue,
        profitLoss,
        profitLossPercentage,
      };
    });

    const investmentsData = {
      stats: {
        totalInvested,
        totalReturns,
        activeInvestments,
        completedInvestments,
        totalProfitLoss,
        totalProfitLossPercentage,
      },
      investments: processedInvestments,
    };

    return NextResponse.json(investmentsData);

  } catch (error) {
    console.error('Investments fetch error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
