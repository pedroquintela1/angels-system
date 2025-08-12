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

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const userId = searchParams.get('userId');

    // Build where clause for transactions
    const where: any = {};

    if (type !== 'all') {
      // Map frontend filter types to database types
      const typeMapping: Record<string, string[]> = {
        membership: ['MEMBERSHIP_PAYMENT'],
        investment: ['INVESTMENT'],
        return: ['RETURN'],
        bonus: ['REFERRAL_BONUS'],
        lottery: ['LOTTERY_PURCHASE', 'LOTTERY_PRIZE'],
      };

      if (typeMapping[type]) {
        where.type = { in: typeMapping[type] };
      } else if (
        type === 'MEMBERSHIP_PAYMENT' ||
        type === 'INVESTMENT' ||
        type === 'RETURN' ||
        type === 'REFERRAL_BONUS' ||
        type === 'LOTTERY_PURCHASE' ||
        type === 'LOTTERY_PRIZE'
      ) {
        where.type = type;
      }
    }

    if (status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (userId) {
      where.userId = userId;
    }

    // Get transactions from the Transaction table
    const transactions = await prisma.transaction.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    });

    // Get total count for pagination
    const totalCount = await prisma.transaction.count({ where });

    // Format transactions for frontend
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      description: transaction.description,
      userId: transaction.userId,
      userName: `${transaction.user.firstName} ${transaction.user.lastName}`,
      userEmail: transaction.user.email,
      opportunityId: null,
      opportunityTitle: null,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      gatewayTransactionId: transaction.gatewayTransactionId,
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    });
  } catch (error) {
    console.error('Financial transactions API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// Create a new transaction (for manual entries)
export async function POST(request: NextRequest) {
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

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await request.json();
    const { type, amount, description, userId, status = 'PENDING' } = body;

    // Validate required fields
    if (!type || !amount || !description || !userId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: type, amount, description, userId' },
        { status: 400 }
      );
    }

    // Validate user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, firstName: true, lastName: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Validate transaction type
    const validTypes = [
      'MEMBERSHIP_PAYMENT',
      'INVESTMENT',
      'RETURN',
      'REFERRAL_BONUS',
      'LOTTERY_PURCHASE',
      'LOTTERY_PRIZE',
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de transação inválido' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses = [
      'PENDING',
      'COMPLETED',
      'FAILED',
      'CANCELLED',
      'REFUNDED',
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Status de transação inválido' },
        { status: 400 }
      );
    }

    // Create transaction
    const transaction = await prisma.transaction.create({
      data: {
        type,
        amount: parseFloat(amount),
        description,
        status,
        userId,
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
      },
    });

    // Format transaction for response
    const formattedTransaction = {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
      description: transaction.description,
      userId: transaction.userId,
      userName: `${transaction.user.firstName} ${transaction.user.lastName}`,
      userEmail: transaction.user.email,
      opportunityId: null,
      opportunityTitle: null,
      createdAt: transaction.createdAt.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      gatewayTransactionId: transaction.gatewayTransactionId,
    };

    return NextResponse.json({
      message: 'Transação criada com sucesso',
      transaction: formattedTransaction,
    });
  } catch (error) {
    console.error('Create transaction API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
