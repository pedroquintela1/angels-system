import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET - Buscar sorteio específico
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const lottery = await prisma.lottery.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        tickets: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        winners: {
          include: {
            user: {
              select: {
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

    // Calcular estatísticas
    const soldCount = lottery.tickets.reduce(
      (sum, ticket) => sum + ticket.quantity,
      0
    );
    const revenue = lottery.tickets.reduce(
      (sum, ticket) => sum + Number(ticket.totalPrice),
      0
    );

    const result = {
      ...lottery,
      soldCount,
      revenue,
      availableCount: lottery.totalNumbers - soldCount,
      progress: (soldCount / lottery.totalNumbers) * 100,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar sorteio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar sorteio
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      title,
      description,
      prize,
      ticketPrice,
      totalNumbers,
      drawDate,
      drawType,
      federalLotteryDate,
      allowMultiplePurchase,
      numbersDigits,
    } = body;

    // Verificar se o sorteio existe
    const existingLottery = await prisma.lottery.findUnique({
      where: { id },
    });

    if (!existingLottery) {
      return NextResponse.json(
        { error: 'Sorteio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se ainda pode ser editado (não deve ter tickets vendidos se for mudança significativa)
    const hasTickets = await prisma.lotteryTicket.count({
      where: { lotteryId: id },
    });

    // Se já tem tickets vendidos, só permitir mudanças em campos não críticos
    const allowedFields: any = {
      title,
      description,
      drawDate: new Date(drawDate).toISOString(),
    };

    if (hasTickets === 0) {
      // Se não tem tickets, pode alterar tudo
      allowedFields.prize = prize;
      allowedFields.ticketPrice = ticketPrice;
      allowedFields.totalNumbers = totalNumbers;
      allowedFields.drawType = drawType;
      allowedFields.federalLotteryDate = federalLotteryDate
        ? new Date(federalLotteryDate).toISOString()
        : null;
      allowedFields.allowMultiplePurchase = allowMultiplePurchase;
      allowedFields.numbersDigits = numbersDigits;
    }

    const updatedLottery = await prisma.lottery.update({
      where: { id },
      data: allowedFields,
    });

    return NextResponse.json(updatedLottery);
  } catch (error) {
    console.error('Erro ao atualizar sorteio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Excluir sorteio
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Verificar se o sorteio existe
    const lottery = await prisma.lottery.findUnique({
      where: { id },
    });

    if (!lottery) {
      return NextResponse.json(
        { error: 'Sorteio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se pode ser excluído (não deve ter tickets vendidos)
    const hasTickets = await prisma.lotteryTicket.count({
      where: { lotteryId: id },
    });

    if (hasTickets > 0) {
      return NextResponse.json(
        { error: 'Não é possível excluir sorteio com tickets vendidos' },
        { status: 400 }
      );
    }

    await prisma.lottery.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir sorteio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
