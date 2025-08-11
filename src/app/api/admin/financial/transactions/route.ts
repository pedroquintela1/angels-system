import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const userId = searchParams.get('userId');
    const opportunityId = searchParams.get('opportunityId');

    // Build where clause
    const where: any = {};

    if (type !== 'all') {
      // Map transaction types to our data model
      if (type === 'investment') {
        // We'll get investments from the Investment table
      } else if (type === 'commission') {
        // We'll need to create a separate query for commissions
      }
    }

    if (status !== 'all') {
      where.status = status.toUpperCase();
    }

    if (userId) {
      where.userId = userId;
    }

    if (opportunityId) {
      where.opportunityId = opportunityId;
    }

    // Get investments (main transaction type)
    const investments = await prisma.userInvestment.findMany({
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
      take: limit,
      skip: offset,
    });

    // Transform investments to transaction format
    const transactions = investments.map(investment => ({
      id: investment.id,
      type: 'investment' as const,
      amount: investment.amount,
      status: 'confirmed',
      description: `Investimento em ${investment.opportunity?.title || 'Oportunidade'}`,
      userId: investment.userId,
      userName: `${investment.user.firstName} ${investment.user.lastName}`,
      userEmail: investment.user.email,
      opportunityId: investment.opportunityId,
      opportunityTitle: investment.opportunity?.title,
      createdAt: investment.createdAt.toISOString(),
      updatedAt: investment.updatedAt.toISOString(),
    }));

    // Get total count for pagination
    const totalCount = await prisma.userInvestment.count({ where });

    return NextResponse.json({
      transactions,
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
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, amount, description, userId, opportunityId, status = 'pending' } = body;

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

    // For now, we'll create manual transactions as investments with a special flag
    // In a full implementation, you'd have a separate Transaction table
    let transaction;

    if (type === 'investment' && opportunityId) {
      // Validate opportunity exists
      const opportunity = await prisma.investmentOpportunity.findUnique({
        where: { id: opportunityId },
        select: { id: true, title: true },
      });

      if (!opportunity) {
        return NextResponse.json(
          { error: 'Oportunidade não encontrada' },
          { status: 404 }
        );
      }

      transaction = await prisma.userInvestment.create({
        data: {
          amount: parseFloat(amount),
          userId,
          opportunityId,
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
      });

      // Transform to transaction format
      const formattedTransaction = {
        id: transaction.id,
        type: 'investment' as const,
        amount: transaction.amount,
        status: 'confirmed',
        description: `Investimento em ${transaction.opportunity?.title || 'Oportunidade'}`,
        userId: transaction.userId,
        userName: `${transaction.user.firstName} ${transaction.user.lastName}`,
        userEmail: transaction.user.email,
        opportunityId: transaction.opportunityId,
        opportunityTitle: transaction.opportunity?.title,
        createdAt: transaction.createdAt.toISOString(),
        updatedAt: transaction.updatedAt.toISOString(),
      };

      return NextResponse.json({
        message: 'Transação criada com sucesso',
        transaction: formattedTransaction,
      });
    }

    // For other transaction types, you would implement similar logic
    // For now, return an error for unsupported types
    return NextResponse.json(
      { error: 'Tipo de transação não suportado ainda' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Create transaction API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
