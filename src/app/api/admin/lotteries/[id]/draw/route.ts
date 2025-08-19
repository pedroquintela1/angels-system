import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Para Loteria Federal, receber o número vencedor da requisição
    const body = await req.json().catch(() => ({}));
    const { winningNumber: providedWinningNumber } = body;

    // Verificar se o sorteio existe e pode ser sorteado
    const lottery = await prisma.lottery.findUnique({
      where: { id },
      include: {
        tickets: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!lottery) {
      return NextResponse.json(
        { error: 'Sorteio não encontrado' },
        { status: 404 }
      );
    }

    if (lottery.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Apenas sorteios ativos podem ser sorteados' },
        { status: 400 }
      );
    }

    if (lottery.tickets.length === 0) {
      return NextResponse.json(
        { error: 'Não há tickets vendidos para este sorteio' },
        { status: 400 }
      );
    }

    if (new Date() < new Date(lottery.drawDate)) {
      return NextResponse.json(
        { error: 'A data do sorteio ainda não chegou' },
        { status: 400 }
      );
    }

    let winningNumber: number;

    // Determinar número vencedor baseado no tipo de sorteio
    if ((lottery as any).drawType === 'FEDERAL_LOTTERY') {
      // Para Loteria Federal, o número deve ser fornecido manualmente
      if (!providedWinningNumber || typeof providedWinningNumber !== 'number') {
        return NextResponse.json(
          {
            error:
              'Para sorteios baseados na Loteria Federal, o número vencedor deve ser fornecido',
          },
          { status: 400 }
        );
      }

      if (
        providedWinningNumber < 1 ||
        providedWinningNumber > lottery.totalNumbers
      ) {
        return NextResponse.json(
          {
            error: `Número vencedor deve estar entre 1 e ${lottery.totalNumbers}`,
          },
          { status: 400 }
        );
      }

      winningNumber = providedWinningNumber;
    } else {
      // Para sorteio por plataforma, gerar número aleatório
      winningNumber = Math.floor(Math.random() * lottery.totalNumbers) + 1;
    }

    // Atualizar status para DRAWING e salvar o número vencedor
    await prisma.lottery.update({
      where: { id },
      data: {
        status: 'DRAWING',
        winningNumber,
      },
    });

    // Procurar ticket vencedor
    let winnerTicket = null;
    for (const ticket of lottery.tickets) {
      let numbers: number[] = [];
      if (Array.isArray(ticket.numbers)) {
        numbers = ticket.numbers as number[];
      } else if (typeof ticket.numbers === 'string') {
        try {
          numbers = JSON.parse(ticket.numbers);
        } catch {
          numbers = [];
        }
      }
      if (numbers.includes(winningNumber)) {
        winnerTicket = ticket;
        break;
      }
    }

    if (!winnerTicket) {
      await prisma.lottery.update({
        where: { id },
        data: {
          status: 'COMPLETED',
        },
      });
      return NextResponse.json({
        winningNumber,
        winners: [],
        message: 'Sorteio realizado sem vencedores. Prêmio será acumulado.',
      });
    }

    // Determinar valor do prêmio para registro no banco
    let prizeAmount = 0;

    if ((lottery as any).prizeType === 'MONEY') {
      // Para prêmios em dinheiro, extrair valor do formato "R$ X.XXX,XX"
      const prizeValue = String(lottery.prize)
        .replace(/[R$\s.]/g, '')
        .replace(',', '.');
      prizeAmount = parseFloat(prizeValue) || 0;
    } else {
      // Para prêmios físicos, tentar extrair valor estimado se existir
      const prizeMatch = String(lottery.prize).match(/R\$\s*([\d.,]+)/);
      if (prizeMatch) {
        const prizeValue = prizeMatch[1]
          .replace(/[.\s]/g, '')
          .replace(',', '.');
        prizeAmount = parseFloat(prizeValue) || 0;
      }
      // Se não encontrar valor monetário, usar 0 (prêmio físico sem valor específico)
    }

    // Criar registro de vencedor
    const winner = await prisma.lotteryWinner.create({
      data: {
        lotteryId: lottery.id,
        userId: winnerTicket.userId,
        ticketId: winnerTicket.id,
        winningNumber,
        prizeAmount: prizeAmount,
        claimedAt: null,
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
    });

    // Atualizar status para COMPLETED
    await prisma.lottery.update({
      where: { id },
      data: {
        status: 'COMPLETED',
      },
    });

    // Criar transação de prêmio para o vencedor
    await prisma.transaction.create({
      data: {
        userId: winner.userId,
        type: 'PRIZE_RECEIVED',
        amount: Number(winner.prizeAmount),
        status: 'PENDING',
        description: `Prêmio do sorteio: ${lottery.title}`,
      },
    });

    // Notificar vencedor
    await prisma.notification.create({
      data: {
        userId: winner.userId,
        title: 'Parabéns! Você ganhou um prêmio!',
        message: `Você ganhou ${new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(Number(winner.prizeAmount))} no sorteio ${lottery.title}!`,
        type: 'PRIZE_WON',
        isRead: false,
      },
    });

    return NextResponse.json({
      winningNumber,
      winners: [
        {
          id: winner.id,
          userId: winner.userId,
          userName: `${winner.user.firstName} ${winner.user.lastName}`,
          userEmail: winner.user.email,
          prizeAmount: Number(winner.prizeAmount),
        },
      ],
      message: `Sorteio realizado com sucesso! 1 vencedor encontrado.`,
    });
  } catch (error) {
    console.error('Erro ao realizar sorteio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
