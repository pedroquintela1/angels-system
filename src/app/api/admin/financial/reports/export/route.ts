import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30');
    const format = searchParams.get('format') || 'csv';
    const reportType = searchParams.get('type') || 'financial';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // Get financial data
    const investments = await prisma.userInvestment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        opportunity: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get opportunities data
    const opportunities = await prisma.investmentOpportunity.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        _count: {
          select: {
            investments: true,
          },
        },
        investments: {
          select: {
            amount: true,
          },
        },
      },
    });

    if (format === 'csv') {
      // Generate CSV report
      let csvContent = '';

      if (reportType === 'financial' || reportType === 'investments') {
        // Investments CSV
        csvContent = 'ID,Data,Usuário,Email,Oportunidade,Valor\n';

        investments.forEach(investment => {
          const row = [
            investment.id,
            investment.createdAt.toLocaleDateString('pt-BR'),
            `${investment.user.firstName} ${investment.user.lastName}`,
            investment.user.email,
            investment.opportunity?.title || 'N/A',
            investment.amount.toString(),
          ]
            .map(field => `"${field}"`)
            .join(',');

          csvContent += row + '\n';
        });
      } else if (reportType === 'opportunities') {
        // Opportunities CSV
        csvContent =
          'ID,Título,Meta,Captado,Investidores,Status,Data Criação\n';

        opportunities.forEach(opportunity => {
          const totalRaised = opportunity.investments.reduce(
            (sum, inv) => sum + inv.amount,
            0
          );

          const row = [
            opportunity.id,
            opportunity.title,
            opportunity.targetAmount.toString(),
            totalRaised.toString(),
            opportunity._count.investments.toString(),
            opportunity.status,
            opportunity.createdAt.toLocaleDateString('pt-BR'),
          ]
            .map(field => `"${field}"`)
            .join(',');

          csvContent += row + '\n';
        });
      }

      // Return CSV file
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    }

    if (format === 'json') {
      // Generate JSON report
      const reportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          period: `${period} dias`,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reportType,
        },
        summary: {
          totalInvestments: investments.length,
          totalAmount: investments.reduce((sum, inv) => sum + inv.amount, 0),
          totalOpportunities: opportunities.length,
          averageInvestment:
            investments.length > 0
              ? investments.reduce((sum, inv) => sum + inv.amount, 0) /
                investments.length
              : 0,
        },
        investments: investments.map(investment => ({
          id: investment.id,
          amount: investment.amount,
          createdAt: investment.createdAt,
          user: {
            id: investment.user.id,
            name: `${investment.user.firstName} ${investment.user.lastName}`,
            email: investment.user.email,
          },
          opportunity: investment.opportunity
            ? {
                id: investment.opportunity.id,
                title: investment.opportunity.title,
              }
            : null,
        })),
        opportunities: opportunities.map(opportunity => {
          const totalRaised = opportunity.investments.reduce(
            (sum, inv) => sum + inv.amount,
            0
          );
          const progress = (totalRaised / opportunity.targetAmount) * 100;

          return {
            id: opportunity.id,
            title: opportunity.title,
            targetAmount: opportunity.targetAmount,
            currentAmount: totalRaised,
            progress: Math.round(progress * 100) / 100,
            investorCount: opportunity._count.investments,
            status: opportunity.status,
            createdAt: opportunity.createdAt,
          };
        }),
      };

      return NextResponse.json(reportData, {
        headers: {
          'Content-Disposition': `attachment; filename="relatorio-${reportType}-${new Date().toISOString().split('T')[0]}.json"`,
        },
      });
    }

    if (format === 'xlsx') {
      // For XLSX format, we would need a library like 'xlsx' or 'exceljs'
      // For now, return a message indicating it's not implemented
      return NextResponse.json(
        {
          error: 'Formato XLSX não implementado ainda',
          message: 'Use formato CSV ou JSON por enquanto',
          availableFormats: ['csv', 'json'],
        },
        { status: 501 }
      );
    }

    return NextResponse.json(
      { error: 'Formato não suportado' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Export report API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
