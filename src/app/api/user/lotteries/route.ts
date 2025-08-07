import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {

    // Dados simulados para sorteios (modelo Lottery não existe ainda)
    const currentLottery = null;
    const userParticipations: any[] = [];
    const pastLotteries: any[] = [];
    const upcomingLotteries: any[] = [];

    // Calcular estatísticas (simuladas)
    const totalParticipations = 0;
    const totalWinnings = 0;
    const currentTickets = 0;
    const luckyNumbers: number[] = [];

    // Dados simulados se não houver sorteio atual
    const defaultCurrentLottery = {
      id: 'default-lottery',
      title: 'Sorteio Mensal de Janeiro 2025',
      description: 'Concorra a R$ 10.000 em prêmios! Sorteio exclusivo para membros ativos.',
      prize: 10000,
      drawDate: new Date('2025-01-31T20:00:00Z').toISOString(),
      status: 'ACTIVE',
      participantsCount: 45,
      userNumbers: [],
      ticketsRemaining: 55,
      totalTickets: 100,
    };

    const lotteryData = {
      currentLottery: defaultCurrentLottery,
      userStats: {
        totalParticipations,
        totalWinnings,
        currentTickets,
        luckyNumbers,
      },
      pastLotteries: [],
      upcomingLotteries: [
        {
          id: 'upcoming-1',
          title: 'Sorteio Especial de Fevereiro 2025',
          prize: 15000,
          drawDate: new Date('2025-02-28T20:00:00Z').toISOString(),
          description: 'Sorteio especial com prêmio aumentado para celebrar o crescimento da comunidade!',
        },
        {
          id: 'upcoming-2',
          title: 'Sorteio de Março 2025',
          prize: 12000,
          drawDate: new Date('2025-03-31T20:00:00Z').toISOString(),
          description: 'Sorteio mensal regular com prêmios incríveis para nossos membros.',
        },
      ],
    };

    return NextResponse.json(lotteryData);

    } catch (error) {
      console.error('Lotteries fetch error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.LOTTERIES,
    action: Action.READ,
  }
);
