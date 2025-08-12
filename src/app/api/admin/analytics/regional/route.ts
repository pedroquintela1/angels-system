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

    // Calcular datas
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - period);

    // Como não temos dados regionais reais no schema atual, vamos simular
    // baseando-se nos estados dos usuários
    const usersByState = await prisma.user.groupBy({
      by: ['state'],
      _count: {
        id: true,
      },
      where: {
        state: { not: null },
        createdAt: { gte: startDate, lte: endDate },
      },
    });

    // Buscar receita por estado (aproximação através dos usuários)
    const regionalData = await Promise.all(
      usersByState.map(async stateData => {
        if (!stateData.state) return null;

        // Buscar usuários deste estado
        const stateUsers = await prisma.user.findMany({
          where: {
            state: stateData.state,
            createdAt: { gte: startDate, lte: endDate },
          },
          select: { id: true },
        });

        const userIds = stateUsers.map(u => u.id);

        // Buscar receita destes usuários
        const stateRevenue = await prisma.transaction.aggregate({
          where: {
            userId: { in: userIds },
            status: 'COMPLETED',
            type: {
              in: [
                'INVESTMENT',
                'MEMBERSHIP_PAYMENT',
                'REFERRAL_BONUS',
                'RETURN',
              ],
            },
            createdAt: { gte: startDate, lte: endDate },
          },
          _sum: { amount: true },
        });

        // Calcular crescimento baseado em período anterior
        const previousStartDate = new Date();
        previousStartDate.setDate(startDate.getDate() - period);

        const previousRevenue = await prisma.transaction.aggregate({
          where: {
            userId: { in: userIds },
            status: 'COMPLETED',
            type: {
              in: [
                'INVESTMENT',
                'MEMBERSHIP_PAYMENT',
                'REFERRAL_BONUS',
                'RETURN',
              ],
            },
            createdAt: { gte: previousStartDate, lt: startDate },
          },
          _sum: { amount: true },
        });

        const currentRevenue = stateRevenue._sum?.amount || 0;
        const prevRevenue = previousRevenue._sum?.amount || 0;
        const growth =
          prevRevenue > 0
            ? ((currentRevenue - prevRevenue) / prevRevenue) * 100
            : 0;

        return {
          region: getStateName(stateData.state),
          users: stateData._count.id,
          revenue: currentRevenue,
          growth: Math.round(growth * 10) / 10,
        };
      })
    );

    // Filtrar nulls
    const validRegionalData = regionalData.filter(Boolean) as any[];

    // Ordenar por receita e retornar top 10
    validRegionalData.sort((a, b) => b.revenue - a.revenue);

    return NextResponse.json(validRegionalData.slice(0, 10));
  } catch (error) {
    console.error('Erro ao buscar dados regionais:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

function getStateName(stateCode: string): string {
  const stateNames: { [key: string]: string } = {
    AC: 'Acre',
    AL: 'Alagoas',
    AP: 'Amapá',
    AM: 'Amazonas',
    BA: 'Bahia',
    CE: 'Ceará',
    DF: 'Distrito Federal',
    ES: 'Espírito Santo',
    GO: 'Goiás',
    MA: 'Maranhão',
    MT: 'Mato Grosso',
    MS: 'Mato Grosso do Sul',
    MG: 'Minas Gerais',
    PA: 'Pará',
    PB: 'Paraíba',
    PR: 'Paraná',
    PE: 'Pernambuco',
    PI: 'Piauí',
    RJ: 'Rio de Janeiro',
    RN: 'Rio Grande do Norte',
    RS: 'Rio Grande do Sul',
    RO: 'Rondônia',
    RR: 'Roraima',
    SC: 'Santa Catarina',
    SP: 'São Paulo',
    SE: 'Sergipe',
    TO: 'Tocantins',
  };

  return stateNames[stateCode] || stateCode;
}
