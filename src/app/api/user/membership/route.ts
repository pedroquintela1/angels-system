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

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        createdAt: true,
        membership: {
          select: {
            status: true,
            monthlyFee: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            nextPaymentDate: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Buscar histórico de pagamentos de membership
    const paymentHistory = await prisma.transaction.findMany({
      where: {
        userId: session.user.id,
        type: 'MEMBERSHIP_PAYMENT',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        amount: true,
        status: true,
        description: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Verificar se o usuário tem membership
    if (!user.membership) {
      return NextResponse.json(
        { error: 'Membership não encontrado' },
        { status: 404 }
      );
    }

    // Calcular estatísticas
    const totalPaid = paymentHistory
      .filter(payment => payment.status === 'COMPLETED')
      .reduce((sum, payment) => sum + payment.amount, 0);

    const completedPayments = paymentHistory.filter(payment => payment.status === 'COMPLETED');
    const consecutiveMonths = completedPayments.length;

    const membershipData = {
      membership: {
        status: user.membership.status,
        nextPaymentDate: user.membership.nextPaymentDate.toISOString(),
        monthlyFee: user.membership.monthlyFee, // Já está em reais no banco
        joinedAt: user.membership.createdAt,
        totalPaid,
        consecutiveMonths,
      },
      paymentHistory: paymentHistory.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        description: payment.description,
        createdAt: payment.createdAt,
        paidAt: payment.status === 'COMPLETED' ? payment.updatedAt : null,
        method: 'Cartão de Crédito', // Placeholder
      })),
      benefits: [
        {
          title: 'Acesso a Oportunidades Exclusivas',
          description: 'Participe de investimentos selecionados pela nossa equipe',
          active: user.membership.status === 'ACTIVE',
        },
        {
          title: 'Sistema de Indicações',
          description: 'Ganhe bônus por cada pessoa que você indicar',
          active: user.membership.status === 'ACTIVE',
        },
        {
          title: 'Participação em Sorteios',
          description: 'Concorra a prêmios mensais exclusivos para membros',
          active: user.membership.status === 'ACTIVE',
        },
        {
          title: 'Suporte Prioritário',
          description: 'Atendimento especializado e prioritário',
          active: user.membership.status === 'ACTIVE',
        },
        {
          title: 'Relatórios Detalhados',
          description: 'Acompanhe seus investimentos com relatórios completos',
          active: user.membership.status === 'ACTIVE',
        },
        {
          title: 'Acesso Antecipado',
          description: 'Seja o primeiro a conhecer novas oportunidades',
          active: user.membership.status === 'ACTIVE',
        },
      ],
    };

    return NextResponse.json(membershipData);

  } catch (error) {
    console.error('Membership fetch error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
