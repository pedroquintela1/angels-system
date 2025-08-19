import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

async function handleStatusUpdate(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { status } = await request.json();
    const { id } = params;

    console.log('Atualizando status do sorteio:', { id, status });

    // Validar status
    const validStatuses = [
      'DRAFT',
      'ACTIVE',
      'DRAWING',
      'COMPLETED',
      'CANCELLED',
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
    }

    // Buscar o sorteio
    const lottery = await prisma.lottery.findUnique({
      where: { id },
    });

    if (!lottery) {
      return NextResponse.json(
        { error: 'Sorteio não encontrado' },
        { status: 404 }
      );
    }

    // Verificar transições válidas
    const validTransitions: Record<string, string[]> = {
      DRAFT: ['ACTIVE', 'CANCELLED'],
      ACTIVE: ['DRAWING', 'CANCELLED'],
      DRAWING: ['COMPLETED', 'ACTIVE'],
      COMPLETED: [],
      CANCELLED: ['ACTIVE'],
    };

    if (!validTransitions[lottery.status]?.includes(status)) {
      return NextResponse.json(
        {
          error: `Não é possível alterar status de ${lottery.status} para ${status}`,
        },
        { status: 400 }
      );
    }

    // Atualizar status
    const updateData: any = { status };

    // Se estiver ativando e não tem data de sorteio, definir uma
    if (status === 'ACTIVE' && !lottery.drawDate) {
      updateData.drawDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias a partir de agora
    }

    const updatedLottery = await prisma.lottery.update({
      where: { id },
      data: updateData,
    });

    console.log('Status atualizado com sucesso:', updatedLottery);

    return NextResponse.json(updatedLottery);
  } catch (error) {
    console.error('Erro ao atualizar status do sorteio:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleStatusUpdate(request, { params });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return handleStatusUpdate(request, { params });
}
