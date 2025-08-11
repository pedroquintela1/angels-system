import { UserRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Check if user has admin access
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const { id: userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        investments: {
          include: {
            opportunity: {
              select: {
                title: true,
                status: true,
              },
            },
          },
        },
        membership: {
          select: {
            status: true,
            monthlyFee: true,
            currentPeriodStart: true,
            currentPeriodEnd: true,
            nextPaymentDate: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get user API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: userId } = await params;

    // Check if user has admin access
    const allowedRoles: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];
    if (!allowedRoles.includes(session.user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, ...updateData } = body;

    let dataToUpdate: any = {};

    // Handle different actions
    switch (action) {
      case 'activate':
        dataToUpdate = { isActive: true };
        break;
      
      case 'deactivate':
        dataToUpdate = { isActive: false };
        break;
      
      case 'verify_kyc':
        dataToUpdate = { kycStatus: 'APPROVED' };
        break;
      
      case 'reject_kyc':
        dataToUpdate = { kycStatus: 'REJECTED' };
        break;
      
      case 'reset_kyc':
        dataToUpdate = { kycStatus: 'PENDING' };
        break;
      
      case 'update':
        // For general updates, use the provided data
        dataToUpdate = updateData;
        break;
      
      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Prevent self-deactivation for super admins
    if (action === 'deactivate' && session.user.id === userId && session.user.role === UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...dataToUpdate,
        updatedAt: new Date(),
      },
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser;

    return NextResponse.json({
      message: 'Usuário atualizado com sucesso',
      user: userWithoutPassword,
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Update user API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { id: userId } = await params;

    // Only super admins can delete users
    if (session.user.role !== UserRole.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Apenas Super Admins podem deletar usuários' },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (session.user.id === userId) {
      return NextResponse.json(
        { error: 'Você não pode deletar sua própria conta' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Delete user (this will cascade delete related records)
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: 'Usuário deletado com sucesso',
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Delete user API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
