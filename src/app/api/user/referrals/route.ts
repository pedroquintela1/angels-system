import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {

      // Buscar dados do usuário com código de referência
      const userData = await prisma.user.findUnique({
        where: {
          id: user.id,
        },
        select: {
          id: true,
          referralCode: true,
          createdAt: true,
        },
      });

      if (!userData) {
        return NextResponse.json(
          { error: 'Usuário não encontrado' },
          { status: 404 }
        );
      }

      // Buscar usuários indicados por este usuário
      const referredUsers = await prisma.user.findMany({
        where: {
          referredBy: user.id,
        },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        createdAt: true,
        membership: {
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Buscar transações de bônus de referência
    const referralBonuses = await prisma.transaction.findMany({
      where: {
        userId: user.id,
        type: 'REFERRAL_BONUS',
      },
      select: {
        id: true,
        amount: true,
        description: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcular estatísticas
    const totalReferrals = referredUsers.length;
    const activeReferrals = referredUsers.filter(ref => ref.membership?.status === 'ACTIVE').length;
    const totalBonusEarned = referralBonuses
      .filter(bonus => bonus.status === 'COMPLETED')
      .reduce((sum, bonus) => sum + bonus.amount, 0);
    const pendingBonuses = referralBonuses
      .filter(bonus => bonus.status === 'PENDING')
      .reduce((sum, bonus) => sum + bonus.amount, 0);

    // Processar dados dos usuários indicados
    const processedReferrals = referredUsers.map(referral => ({
      id: referral.id,
      name: `${referral.firstName} ${referral.lastName}`,
      email: referral.email,
      joinedAt: referral.createdAt,
      membershipStatus: referral.membership?.status || 'INACTIVE',
      bonusEarned: referralBonuses
        .filter(bonus => bonus.description?.includes(referral.email) && bonus.status === 'COMPLETED')
        .reduce((sum, bonus) => sum + bonus.amount, 0),
    }));

      const referralData = {
        referralCode: userData.referralCode,
        referralLink: `${process.env.NEXTAUTH_URL}/auth/signup?ref=${userData.referralCode}`,
      stats: {
        totalReferrals,
        activeReferrals,
        totalBonusEarned,
        pendingBonuses,
      },
      referrals: processedReferrals,
      bonusHistory: referralBonuses.map(bonus => ({
        id: bonus.id,
        amount: bonus.amount,
        description: bonus.description,
        status: bonus.status,
        date: bonus.createdAt,
      })),
      bonusStructure: [
        {
          level: 1,
          description: 'Indicação direta',
          bonus: 50, // R$ 50,00
          condition: 'Pessoa indicada se torna membro ativo',
        },
        {
          level: 2,
          description: 'Primeiro investimento',
          bonus: 100, // R$ 100,00
          condition: 'Pessoa indicada faz seu primeiro investimento',
        },
        {
          level: 3,
          description: 'Bônus mensal',
          bonus: 10, // R$ 10,00
          condition: 'Por cada mês que a pessoa indicada mantém membership ativo',
        },
      ],
    };

    return NextResponse.json(referralData);

    } catch (error) {
      console.error('Referrals fetch error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.REFERRALS,
    action: Action.READ,
  }
);
