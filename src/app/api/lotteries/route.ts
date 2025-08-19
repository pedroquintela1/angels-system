import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Buscar rifas ativas
    const lotteries = await prisma.lottery.findMany({
      where: {
        status: 'ACTIVE',
        drawDate: {
          gt: new Date(),
        },
      },
      include: {
        tickets: {
          select: {
            numbers: true,
          },
        },
      },
      orderBy: {
        drawDate: 'asc',
      },
    });

    // Calcular estatísticas para cada rifa
    const lotteriesWithStats = lotteries.map(lottery => {
      const soldNumbers = new Set<number>();
      lottery.tickets.forEach(ticket => {
        const numbers = Array.isArray(ticket.numbers) ? ticket.numbers : [];
        numbers.forEach((num: any) => soldNumbers.add(Number(num)));
      });

      const soldCount = soldNumbers.size;
      const availableCount = lottery.totalNumbers - soldCount;
      const progress = (soldCount / lottery.totalNumbers) * 100;

  return {
        id: lottery.id,
        title: lottery.title,
        description: lottery.description,
        prize: lottery.prize, // Agora retorna a string diretamente
        ticketPrice: Number(lottery.ticketPrice),
        totalNumbers: lottery.totalNumbers,
        soldCount,
        availableCount,
        progress: Math.round(progress * 100) / 100,
        drawDate: lottery.drawDate.toISOString(),
        numbersDigits: lottery.numbersDigits,
        allowMultiplePurchase: lottery.allowMultiplePurchase,
      };
    });

    return NextResponse.json(lotteriesWithStats);
  } catch (error) {
    console.error('Erro ao buscar rifas:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
