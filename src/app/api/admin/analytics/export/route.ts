import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { type, period, metrics } = body;

    // Calcular datas
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(period || '30'));

    // Buscar dados para o relatório
    const [transactions, users, investments] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          status: 'COMPLETED',
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),

      prisma.user.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          state: true,
          createdAt: true,
          role: true,
        },
        orderBy: { createdAt: 'desc' },
      }),

      prisma.userInvestment.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          opportunity: {
            select: {
              title: true,
              expectedReturn: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (type === 'csv') {
      // Gerar CSV
      let csvContent = '';

      if (metrics === 'revenue' || !metrics) {
        csvContent += 'RELATÓRIO DE TRANSAÇÕES\n';
        csvContent += 'Data,Usuário,Email,Tipo,Status,Valor,Descrição\n';

        transactions.forEach(transaction => {
          csvContent += `${new Date(transaction.createdAt).toLocaleDateString('pt-BR')},`;
          csvContent += `"${transaction.user.firstName} ${transaction.user.lastName}",`;
          csvContent += `${transaction.user.email},`;
          csvContent += `${getTransactionTypeName(transaction.type)},`;
          csvContent += `${getTransactionStatusName(transaction.status)},`;
          csvContent += `"R$ ${transaction.amount.toFixed(2)}",`;
          csvContent += `"${transaction.description}"\n`;
        });

        csvContent += '\n\nRESUMO FINANCEIRO\n';
        const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0);
        csvContent += `Total de Transações,${transactions.length}\n`;
        csvContent += `Receita Total,"R$ ${totalRevenue.toFixed(2)}"\n`;
        csvContent += `Valor Médio por Transação,"R$ ${(totalRevenue / transactions.length || 0).toFixed(2)}"\n`;
      }

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename=relatorio-analytics-${new Date().toISOString().split('T')[0]}.csv`,
        },
      });
    }

    if (type === 'excel' || type === 'pdf') {
      // Para Excel e PDF, retornaremos um JSON com os dados formatados
      // Em uma implementação real, você usaria bibliotecas como exceljs ou puppeteer
      const reportData = {
        period: `${startDate.toLocaleDateString('pt-BR')} - ${endDate.toLocaleDateString('pt-BR')}`,
        summary: {
          totalTransactions: transactions.length,
          totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
          totalUsers: users.length,
          totalInvestments: investments.length,
          totalInvestmentValue: investments.reduce(
            (sum, i) => sum + i.amount,
            0
          ),
        },
        transactions: transactions.map(t => ({
          date: new Date(t.createdAt).toLocaleDateString('pt-BR'),
          user: `${t.user.firstName} ${t.user.lastName}`,
          email: t.user.email,
          type: getTransactionTypeName(t.type),
          status: getTransactionStatusName(t.status),
          amount: t.amount,
          description: t.description,
        })),
        users: users.map(u => ({
          name: `${u.firstName} ${u.lastName}`,
          email: u.email,
          state: u.state || 'N/A',
          role: u.role,
          createdAt: new Date(u.createdAt).toLocaleDateString('pt-BR'),
        })),
        investments: investments.map(i => ({
          user: `${i.user.firstName} ${i.user.lastName}`,
          opportunity: i.opportunity.title,
          amount: i.amount,
          expectedReturn: i.opportunity.expectedReturn,
          date: new Date(i.createdAt).toLocaleDateString('pt-BR'),
        })),
      };

      // Simular geração de arquivo
      const fileContent = JSON.stringify(reportData, null, 2);

      return new NextResponse(fileContent, {
        headers: {
          'Content-Type':
            type === 'excel'
              ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
              : 'application/pdf',
          'Content-Disposition': `attachment; filename=relatorio-analytics-${new Date().toISOString().split('T')[0]}.${type === 'excel' ? 'xlsx' : 'pdf'}`,
        },
      });
    }

    return NextResponse.json(
      { error: 'Tipo de relatório não suportado' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erro ao exportar relatório:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

function getTransactionTypeName(type: string): string {
  const typeNames: { [key: string]: string } = {
    INVESTMENT: 'Investimento',
    MEMBERSHIP_PAYMENT: 'Pagamento de Assinatura',
    REFERRAL_BONUS: 'Bônus de Indicação',
    RETURN: 'Retorno de Investimento',
    LOTTERY_PURCHASE: 'Compra de Loteria',
    LOTTERY_PRIZE: 'Prêmio de Loteria',
  };

  return typeNames[type] || type;
}

function getTransactionStatusName(status: string): string {
  const statusNames: { [key: string]: string } = {
    PENDING: 'Pendente',
    COMPLETED: 'Concluído',
    FAILED: 'Falhou',
    CANCELLED: 'Cancelado',
    REFUNDED: 'Reembolsado',
  };

  return statusNames[status] || status;
}
