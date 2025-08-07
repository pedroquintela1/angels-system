import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { authOptions } from '@/lib/auth';
import { notificationService } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const unreadCount = await notificationService.getUnreadCount(session.user.id);

    return NextResponse.json({
      unreadCount,
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get unread count API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
