import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Iniciando busca de métricas de analytics...');

    const session = await getServerSession(authOptions);

    if (!session?.user) {
      console.log('❌ Usuário não autenticado');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    console.log('✅ Usuário autenticado:', session.user.email);

    // Verificar se é admin ou super admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    console.log('👤 Role do usuário:', user?.role);

    if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      console.log('❌ Acesso negado - role inadequado');
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30');

    console.log('📅 Período selecionado:', period, 'dias');

    // Calcular datas
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    // Período anterior para comparação
    const previousStartDate = new Date();
    previousStartDate.setDate(startDate.getDate() - period);

    console.log('📊 Buscando dados financeiros...');

    // Métricas Financeiras
    const [currentRevenue, previousRevenue] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
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
        _count: true,
      }),
      prisma.transaction.aggregate({
        where: {
          createdAt: { gte: previousStartDate, lt: startDate },
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
    ]);

    console.log('💰 Receita atual:', currentRevenue);
    console.log('💰 Receita anterior:', previousRevenue);

    console.log('👥 Buscando dados de usuários...');

    // Métricas de Usuários
    const [totalUsers, activeUsers, activeSubscribers, newUsersThisMonth] =
      await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            isActive: true,
          },
        }),
        prisma.user.count({
          where: {
            isActive: true,
            role: 'USER',
            membership: {
              status: 'ACTIVE',
            },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: startDate },
          },
        }),
      ]);

    console.log('👥 Total usuários:', totalUsers);
    console.log('👥 Usuários ativos:', activeUsers);
    console.log('👥 Assinantes ativos:', activeSubscribers);
    console.log('👥 Novos usuários:', newUsersThisMonth);

    // Usuários do período anterior
    const previousUsers = await prisma.user.count({
      where: {
        createdAt: { gte: previousStartDate, lt: startDate },
      },
    });

    // Métricas de Investimentos
    const [currentInvestments, previousInvestments] = await Promise.all([
      prisma.userInvestment.aggregate({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.userInvestment.aggregate({
        where: {
          createdAt: { gte: previousStartDate, lt: startDate },
        },
        _sum: { amount: true },
      }),
    ]);

    // Calcular crescimentos
    const revenueGrowth = previousRevenue._sum?.amount
      ? (((currentRevenue._sum?.amount || 0) -
          (previousRevenue._sum?.amount || 0)) /
          (previousRevenue._sum?.amount || 1)) *
        100
      : 0;

    const userGrowthRate = previousUsers
      ? ((newUsersThisMonth - previousUsers) / previousUsers) * 100
      : 0;

    const investmentGrowth = previousInvestments._sum?.amount
      ? (((currentInvestments._sum?.amount || 0) -
          (previousInvestments._sum?.amount || 0)) /
          (previousInvestments._sum?.amount || 1)) *
        100
      : 0;

    // Calcular métricas avançadas
    const averageTransactionValue = currentRevenue._count
      ? (currentRevenue._sum?.amount || 0) / currentRevenue._count
      : 0;

    const averageInvestmentValue = currentInvestments._count
      ? (currentInvestments._sum?.amount || 0) / currentInvestments._count
      : 0;

    // Cálculo de métricas de performance baseado em dados reais
    const usersWithInvestments = await prisma.user.count({
      where: {
        investments: {
          some: {},
        },
      },
    });

    const usersWithTransactions = await prisma.user.count({
      where: {
        transactions: {
          some: {
            status: 'COMPLETED',
          },
        },
      },
    });

    // Cálculos reais
    const conversionRate =
      totalUsers > 0 ? (usersWithInvestments / totalUsers) * 100 : 0;
    const retentionRate =
      totalUsers > 0 ? (usersWithTransactions / totalUsers) * 100 : 0;
    const churnRate =
      totalUsers > 0 ? ((totalUsers - activeUsers) / totalUsers) * 100 : 0;

    // LTV real baseado em transações
    const userTransactionSums = await prisma.user.findMany({
      where: {
        transactions: {
          some: {
            status: 'COMPLETED',
          },
        },
      },
      include: {
        transactions: {
          where: {
            status: 'COMPLETED',
          },
        },
      },
    });

    let totalRevenueFromUsers = 0;
    userTransactionSums.forEach(user => {
      const userRevenue = user.transactions.reduce(
        (sum, t) => sum + t.amount,
        0
      );
      totalRevenueFromUsers += userRevenue;
    });

    const ltv =
      userTransactionSums.length > 0
        ? totalRevenueFromUsers / userTransactionSums.length
        : 0;

    // Categorias de investimento (simulado - você pode adaptar conforme sua estrutura)
    const topInvestmentCategories = [
      {
        category: 'Renda Fixa',
        value: (currentInvestments._sum?.amount || 0) * 0.4,
        percentage: 40,
      },
      {
        category: 'Renda Variável',
        value: (currentInvestments._sum?.amount || 0) * 0.35,
        percentage: 35,
      },
      {
        category: 'Fundos Imobiliários',
        value: (currentInvestments._sum?.amount || 0) * 0.15,
        percentage: 15,
      },
      {
        category: 'Criptomoedas',
        value: (currentInvestments._sum?.amount || 0) * 0.1,
        percentage: 10,
      },
    ];

    const analytics = {
      // Métricas Financeiras
      totalRevenue: currentRevenue._sum?.amount || 0,
      monthlyRevenue: (currentRevenue._sum?.amount || 0) / (period / 30),
      averageTransactionValue,
      revenueGrowth,

      // Métricas de Usuários
      totalUsers,
      activeUsers,
      activeSubscribers,
      newUsersThisMonth,
      userGrowthRate,

      // Métricas de Investimentos
      totalInvestments: currentInvestments._sum?.amount || 0,
      averageInvestmentValue,
      investmentGrowth,
      topInvestmentCategories,

      // Métricas de Performance
      conversionRate,
      retentionRate,
      churnRate,
      ltv,
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Erro ao buscar métricas de analytics:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
