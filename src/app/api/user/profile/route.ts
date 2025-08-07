import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  phone: z.string().min(10, 'Telefone deve ter pelo menos 10 dígitos'),
});

// GET - Buscar perfil do usuário
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        cpf: true,
        kycStatus: true,
        createdAt: true,
        updatedAt: true,
        // membershipStatus não existe no schema, vamos usar a relação membership
        membership: {
          select: {
            status: true,
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

    // Garantir que todos os campos existam e processar membership
    const userWithDefaults = {
      ...user,
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      phone: user.phone || '',
      cpf: user.cpf || '',
      membershipStatus: user.membership?.status || 'INACTIVE',
      kycSubmittedAt: null, // Campo não existe no schema atual
      kycApprovedAt: null,  // Campo não existe no schema atual
      documents: [], // Por enquanto, sem sistema de documentos
    };

    // Remover a relação membership do objeto retornado
    const { membership, ...userResponse } = userWithDefaults;

    return NextResponse.json(userResponse);

  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT - Atualizar perfil do usuário
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        cpf: true,
        kycStatus: true,
        createdAt: true,
        updatedAt: true,
        membership: {
          select: {
            status: true,
          },
        },
      },
    });

    // Processar dados do usuário atualizado
    const userWithDefaults = {
      ...updatedUser,
      firstName: updatedUser.firstName || '',
      lastName: updatedUser.lastName || '',
      phone: updatedUser.phone || '',
      cpf: updatedUser.cpf || '',
      membershipStatus: updatedUser.membership?.status || 'INACTIVE',
      kycSubmittedAt: null, // Campo não existe no schema atual
      kycApprovedAt: null,  // Campo não existe no schema atual
      documents: [], // Por enquanto, sem sistema de documentos
    };

    // Remover a relação membership do objeto retornado
    const { membership, ...userResponse } = userWithDefaults;

    return NextResponse.json({
      message: 'Perfil atualizado com sucesso',
      user: userResponse,
    });

  } catch (error) {
    console.error('Profile update error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
