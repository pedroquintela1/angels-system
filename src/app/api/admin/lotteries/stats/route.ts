import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Estatísticas das rifas
    const [
      totalLotteries,
      activeLotteries,
      totalTickets,
      totalRevenue,
      totalPrizes,
      uniqueParticipants,
    ] = await Promise.all([
      // Total de rifas
      prisma.lottery.count(),

      // Rifas ativas
      prisma.lottery.count({
        where: { status: 'ACTIVE' },
      }),

      // Total de tickets vendidos
      prisma.lotteryTicket.count(),

      // Receita total
      prisma.lotteryTicket.aggregate({
        _sum: {
          totalPrice: true,
        },
      }),

      // Total de prêmios pagos
      prisma.lotteryWinner.aggregate({
        _sum: {
          prizeAmount: true,
        },
      }),

      // Participantes únicos
      prisma.lotteryTicket.findMany({
        select: {
          userId: true,
        },
        distinct: ['userId'],
      }),
    ]);

    // Calcular média de tickets por rifa
    const avgTicketsPerLottery =
      totalLotteries > 0 ? totalTickets / totalLotteries : 0;

    const stats = {
      totalLotteries,
      activeLotteries,
      totalRevenue: Number(totalRevenue._sum.totalPrice || 0),
      totalPrizes: Number(totalPrizes._sum.prizeAmount || 0),
      totalParticipants: uniqueParticipants.length,
      avgTicketsPerLottery: Math.round(avgTicketsPerLottery * 100) / 100,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
