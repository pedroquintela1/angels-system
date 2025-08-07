import { UserRole } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { userIds, action } = body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: 'IDs de usuários são obrigatórios' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'Ação é obrigatória' },
        { status: 400 }
      );
    }

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
      
      default:
        return NextResponse.json(
          { error: 'Ação não reconhecida' },
          { status: 400 }
        );
    }

    // Prevent self-deactivation
    if (action === 'deactivate' && userIds.includes(session.user.id)) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      );
    }

    // Update users in bulk
    const result = await prisma.user.updateMany({
      where: {
        id: {
          in: userIds,
        },
      },
      data: {
        ...dataToUpdate,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: `${result.count} usuário(s) atualizado(s) com sucesso`,
      updatedCount: result.count,
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Bulk update users API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
