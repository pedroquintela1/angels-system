import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Verificar se é admin ou super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30');

    // Calcular número de pontos de dados baseado no período
    let intervals = 7; // Default para 7 dias
    let intervalDays = Math.floor(period / intervals);

    if (period <= 7) {
      intervals = period;
      intervalDays = 1;
    } else if (period <= 30) {
      intervals = 7;
      intervalDays = Math.floor(period / 7);
    } else if (period <= 90) {
      intervals = 12;
      intervalDays = Math.floor(period / 12);
    } else {
      intervals = 12;
      intervalDays = Math.floor(period / 12);
    }

    const timeSeriesData = [];
    const endDate = new Date();

    for (let i = intervals - 1; i >= 0; i--) {
      const intervalEnd = new Date(endDate);
      intervalEnd.setDate(endDate.getDate() - i * intervalDays);

      const intervalStart = new Date(intervalEnd);
      intervalStart.setDate(intervalEnd.getDate() - intervalDays);

      // Buscar dados para este intervalo
      const [revenue, users, investments, transactions] = await Promise.all([
        // Receita
        prisma.transaction.aggregate({
          where: {
            createdAt: { gte: intervalStart, lt: intervalEnd },
            status: 'COMPLETED',
            type: {
              in: [
                'INVESTMENT',
                'MEMBERSHIP_PAYMENT',
                'REFERRAL_BONUS',
                'RETURN',
              ],
            },
          },
          _sum: { amount: true },
        }),

        // Novos usuários
        prisma.user.count({
          where: {
            createdAt: { gte: intervalStart, lt: intervalEnd },
          },
        }),

        // Investimentos
        prisma.userInvestment.aggregate({
          where: {
            createdAt: { gte: intervalStart, lt: intervalEnd },
          },
          _sum: { amount: true },
        }),

        // Número de transações
        prisma.transaction.count({
          where: {
            createdAt: { gte: intervalStart, lt: intervalEnd },
            status: 'COMPLETED',
          },
        }),
      ]);

      // Formatar período
      let periodLabel = '';
      if (intervalDays === 1) {
        periodLabel = intervalEnd.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        });
      } else if (intervalDays <= 7) {
        periodLabel = `${intervalStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} - ${intervalEnd.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
      } else {
        periodLabel = intervalEnd.toLocaleDateString('pt-BR', {
          month: 'short',
          year: '2-digit',
        });
      }

      timeSeriesData.push({
        period: periodLabel,
        revenue: revenue._sum?.amount || 0,
        users: users,
        investments: investments._sum?.amount || 0,
        transactions: transactions,
      });
    }

    return NextResponse.json(timeSeriesData);
  } catch (error) {
    console.error('Erro ao buscar dados de série temporal:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
