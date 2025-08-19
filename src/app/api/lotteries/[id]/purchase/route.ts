import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 401 });
    }

    const body = await req.json();
    const { quantity } = body;

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Quantidade deve ser maior que zero' },
        { status: 400 }
      );
    }

    // Verificar se a rifa existe e está ativa
    const lottery = await prisma.lottery.findUnique({
      where: { id: params.id },
      include: {
        tickets: {
          select: {
            numbers: true,
          },
        },
      },
    });

    if (!lottery) {
      return NextResponse.json(
        { error: 'Rifa não encontrada' },
        { status: 404 }
      );
    }

    if (lottery.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Esta rifa não está ativa para vendas' },
        { status: 400 }
      );
    }

    if (new Date() >= new Date(lottery.drawDate)) {
      return NextResponse.json(
        { error: 'O prazo para compra de números já expirou' },
        { status: 400 }
      );
    }

    if (!lottery.allowMultiplePurchase && quantity > 1) {
      return NextResponse.json(
        { error: 'Esta rifa não permite compra de múltiplos números' },
        { status: 400 }
      );
    }

    // Verificar números já vendidos
    const soldNumbers = new Set<number>();
    lottery.tickets.forEach(ticket => {
      const numbers = Array.isArray(ticket.numbers) ? ticket.numbers : [];
      numbers.forEach((num: any) => soldNumbers.add(Number(num)));
    });

    // Verificar se há números suficientes disponíveis
    const availableCount = lottery.totalNumbers - soldNumbers.size;
    if (quantity > availableCount) {
      return NextResponse.json(
        { error: `Apenas ${availableCount} números disponíveis` },
        { status: 400 }
      );
    }

    // Gerar números aleatórios disponíveis
    const selectedNumbers: number[] = [];
    const availableNumbers = [];
    for (let i = 1; i <= lottery.totalNumbers; i++) {
      if (!soldNumbers.has(i)) {
        availableNumbers.push(i);
      }
    }

    // Selecionar números aleatoriamente
    for (let i = 0; i < quantity; i++) {
      const randomIndex = Math.floor(Math.random() * availableNumbers.length);
      const selectedNumber = availableNumbers.splice(randomIndex, 1)[0];
      selectedNumbers.push(selectedNumber);
    }

    const totalPrice = Number(lottery.ticketPrice) * quantity;

    // Criar ticket
    const ticket = await prisma.lotteryTicket.create({
      data: {
        lotteryId: lottery.id,
        userId: session.user.id,
        numbers: selectedNumbers,
        quantity,
        totalPrice,
      },
    });

    // Criar transação
    await prisma.transaction.create({
      data: {
        userId: session.user.id,
        type: 'LOTTERY_PURCHASE',
        amount: totalPrice,
        status: 'COMPLETED',
        description: `Compra de ${quantity} número(s) da rifa: ${lottery.title}`,
      },
    });

    // Notificar usuário
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: 'Compra realizada com sucesso!',
        message: `Você comprou ${quantity} número(s) da rifa "${lottery.title}". Seus números: ${selectedNumbers.map(n => String(n).padStart(lottery.numbersDigits, '0')).join(', ')}`,
        type: 'PURCHASE_CONFIRMATION',
        isRead: false,
      },
    });

    return NextResponse.json({
      success: true,
      ticketId: ticket.id,
      numbers: selectedNumbers,
      totalPrice,
      message: `Compra realizada com sucesso! Seus números: ${selectedNumbers.map(n => String(n).padStart(lottery.numbersDigits, '0')).join(', ')}`,
    });
  } catch (error) {
    console.error('Erro ao comprar números:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET - Buscar números disponíveis
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const lottery = await prisma.lottery.findUnique({
      where: { id: params.id },
      include: {
        tickets: {
          select: {
            numbers: true,
          },
        },
      },
    });

    if (!lottery) {
      return NextResponse.json(
        { error: 'Rifa não encontrada' },
        { status: 404 }
      );
    }

    // Calcular números vendidos
    const soldNumbers = new Set<number>();
    lottery.tickets.forEach(ticket => {
      const numbers = Array.isArray(ticket.numbers) ? ticket.numbers : [];
      numbers.forEach((num: any) => soldNumbers.add(Number(num)));
    });

    const availableCount = lottery.totalNumbers - soldNumbers.size;

    return NextResponse.json({
      totalNumbers: lottery.totalNumbers,
      soldCount: soldNumbers.size,
      availableCount,
      soldNumbers: Array.from(soldNumbers).sort((a, b) => a - b),
      ticketPrice: lottery.ticketPrice,
      allowMultiplePurchase: lottery.allowMultiplePurchase,
      numbersDigits: lottery.numbersDigits,
    });
  } catch (error) {
    console.error('Erro ao buscar números disponíveis:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
