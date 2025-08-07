import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Create test notifications
    const testNotifications = [
      {
        userId: session.user.id,
        title: '🎉 KYC Aprovado!',
        message: 'Seu documento RG/CNH (Frente) foi aprovado com sucesso!',
        type: 'kyc_approved',
      },
      {
        userId: session.user.id,
        title: '❌ Documento Rejeitado',
        message: 'Seu documento Comprovante de Residência foi rejeitado. Motivo: Documento ilegível.',
        type: 'kyc_rejected',
      },
      {
        userId: session.user.id,
        title: '🔄 Reenvio Solicitado',
        message: 'Por favor, reenvie seu documento CPF. Instruções: Certifique-se de que o documento esteja bem iluminado.',
        type: 'kyc_resubmit',
      },
      {
        userId: session.user.id,
        title: '🏆 Verificação Completa!',
        message: 'Parabéns! Sua verificação KYC foi aprovada completamente. Agora você tem acesso total à plataforma.',
        type: 'kyc_complete',
      },
      {
        userId: session.user.id,
        title: '📢 Nova Oportunidade',
        message: 'Uma nova oportunidade de investimento está disponível: Expansão de Franquia de Alimentação.',
        type: 'investment_opportunity',
      },
    ];

    const createdNotifications = [];

    for (const notificationData of testNotifications) {
      const notification = await notificationService.createNotification(notificationData);
      createdNotifications.push(notification);
    }

    return NextResponse.json({
      message: 'Notificações de teste criadas com sucesso!',
      count: createdNotifications.length,
      notifications: createdNotifications,
    });

  } catch (error) {
    console.error('Test notifications API error:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
