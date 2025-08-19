import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Buscar rifas com estatísticas agregadas
    const lotteries = await prisma.lottery.findMany({
      include: {
        tickets: {
          select: {
            id: true,
            userId: true,
            numbers: true,
            quantity: true,
          },
        },
        winners: {
          select: {
            id: true,
            prizeAmount: true,
          },
        },
        _count: {
          select: {
            tickets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Calcular estatísticas para cada rifa
    const lotteriesWithStats = lotteries.map((lottery: any) => {
      // Calcular total de números vendidos
      const totalNumbersSold = lottery.tickets.reduce(
        (sum: number, ticket: any) => {
          const numbers = Array.isArray(ticket.numbers) ? ticket.numbers : [];
          return sum + numbers.length;
        },
        0
      );

      const uniqueParticipants = new Set(
        lottery.tickets.map((t: any) => t.userId)
      ).size;
      const revenue = lottery.tickets.reduce((sum: number, ticket: any) => {
        return sum + ticket.quantity * Number(lottery.ticketPrice);
      }, 0);

      // Calcular números disponíveis
      const numbersAvailable = lottery.totalNumbers - totalNumbersSold;

      return {
        id: lottery.id,
        title: lottery.title,
        description: lottery.description,
        prize: lottery.prize,
        ticketPrice: lottery.ticketPrice,
        totalNumbers: lottery.totalNumbers,
        drawDate: lottery.drawDate.toISOString(),
        status: lottery.status,
        winningNumber: lottery.winningNumber,
        numbersDigits: lottery.numbersDigits,
        allowMultiplePurchase: lottery.allowMultiplePurchase,
        createdAt: lottery.createdAt.toISOString(),
        updatedAt: lottery.updatedAt.toISOString(),
        ticketsSold: totalNumbersSold,
        participants: uniqueParticipants,
        revenue,
        numbersAvailable,
      };
    });

    return NextResponse.json(lotteriesWithStats);
  } catch (error) {
    console.error('Erro ao buscar sorteios:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    console.log('Received lottery creation request:', body);

    const {
      title,
      description,
      prize,
      ticketPrice,
      totalNumbers,
      drawDate,
      drawType = 'PLATFORM',
      federalLotteryDate,
      allowMultiplePurchase,
    } = body;

    // Log the extracted values
    console.log('Extracted values:', {
      title,
      description,
      prize,
      ticketPrice,
      totalNumbers,
      drawDate,
      drawType,
      federalLotteryDate,
      allowMultiplePurchase,
    });

    // Validações
    if (
      !title ||
      !description ||
      !prize ||
      !ticketPrice ||
      !totalNumbers ||
      !drawDate
    ) {
      console.log('Validation failed - missing required fields:', {
        title: !!title,
        description: !!description,
        prize: !!prize,
        ticketPrice: !!ticketPrice,
        totalNumbers: !!totalNumbers,
        drawDate: !!drawDate,
      });
      return NextResponse.json(
        { error: 'Todos os campos obrigatórios devem ser preenchidos' },
        { status: 400 }
      );
    }

    if (ticketPrice <= 0 || totalNumbers <= 0) {
      console.log('Validation failed - invalid values:', {
        ticketPrice: ticketPrice <= 0 ? 'invalid' : 'valid',
        totalNumbers: totalNumbers <= 0 ? 'invalid' : 'valid',
      });
      return NextResponse.json(
        { error: 'Preço do bilhete e total de números devem ser positivos' },
        { status: 400 }
      );
    }

    if (totalNumbers > 10000000) {
      console.log('Validation failed - totalNumbers too high:', totalNumbers);
      return NextResponse.json(
        { error: 'Total de números não pode exceder 10.000.000' },
        { status: 400 }
      );
    }

    const drawDateObj = new Date(drawDate);
    const now = new Date();
    // Adicionar 1 hora de tolerância para evitar problemas de timezone
    const tolerance = new Date(now.getTime() - 60 * 60 * 1000);

    console.log('Date validation:', {
      drawDate,
      drawDateObj: drawDateObj.toISOString(),
      now: now.toISOString(),
      tolerance: tolerance.toISOString(),
      isValid: drawDateObj > tolerance,
    });

    if (drawDateObj < tolerance) {
      console.log('Validation failed - drawDate too far in past:', {
        drawDate,
        tolerance: tolerance.toISOString(),
      });
      return NextResponse.json(
        { error: 'Data do sorteio deve ser no futuro' },
        { status: 400 }
      );
    }

    // Validações específicas para Loteria Federal
    if (drawType === 'FEDERAL_LOTTERY') {
      if (!federalLotteryDate) {
        return NextResponse.json(
          {
            error:
              'Data da Loteria Federal é obrigatória para este tipo de sorteio',
          },
          { status: 400 }
        );
      }
    }

    // Calcular automaticamente o número de dígitos baseado na quantidade total
    // Para totalNumbers = 1.000.000, o número máximo é 1000000 (7 dígitos)
    const numbersDigits = Math.floor(Math.log10(totalNumbers)) + 1;

    const lottery = await prisma.lottery.create({
      data: {
        title,
        description,
        prize: prize.toString(), // Converte para string
        ticketPrice: parseFloat(ticketPrice),
        totalNumbers: parseInt(totalNumbers),
        drawDate: new Date(drawDate),
        drawType,
        federalLotteryDate: federalLotteryDate
          ? new Date(federalLotteryDate)
          : null,
        numbersDigits,
        allowMultiplePurchase: allowMultiplePurchase ?? true,
        status: 'DRAFT',
        createdById: session.user.id,
      },
    });

    return NextResponse.json(
      {
        id: lottery.id,
        message: 'Rifa criada com sucesso',
        numbersDigits, // Retornar o número de dígitos calculado
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Erro ao criar rifa:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
