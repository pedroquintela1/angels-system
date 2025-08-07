import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export const GET = withAuth(
  async (_request: NextRequest, user) => {
    try {

    // Buscar oportunidades disponíveis
    const opportunities = await prisma.investmentOpportunity.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'COMPLETED'], // Mostrar ativas e concluídas
        },
      },
      include: {
        documents: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        investments: {
          where: {
            userId: user.id,
          },
          select: {
            amount: true,
            investedAt: true,
          },
        },
        _count: {
          select: {
            investments: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' }, // ACTIVE primeiro
        { createdAt: 'desc' },
      ],
    });

    // Processar dados das oportunidades
    const processedOpportunities = opportunities.map(opportunity => {
      const userInvestment = opportunity.investments[0] || null;
      
      return {
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        status: opportunity.status,
        targetAmount: opportunity.targetAmount,
        currentAmount: opportunity.currentAmount,
        minInvestment: opportunity.minInvestment,
        maxInvestment: opportunity.maxInvestment,
        startDate: opportunity.startDate,
        endDate: opportunity.endDate,
        investorsCount: opportunity._count.investments,
        documents: opportunity.documents,
        userInvestment: userInvestment ? {
          amount: userInvestment.amount,
          investedAt: userInvestment.investedAt,
        } : null,
      };
    });

    const opportunitiesData = {
      opportunities: processedOpportunities,
    };

    return NextResponse.json(opportunitiesData);

    } catch (error) {
      console.error('Opportunities fetch error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.OPPORTUNITIES,
    action: Action.READ,
    requireAuth: true,
    ownershipCheck: false,
  }
);
