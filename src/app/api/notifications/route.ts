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

    const { searchParams } = new URL(request.url);
    const isRead = searchParams.get('isRead');
    const type = searchParams.get('type');
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');

    const filters = {
      userId: session.user.id,
      isRead: isRead ? isRead === 'true' : undefined,
      type: type || undefined,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    };

    const notifications = await notificationService.getUserNotifications(filters);
    const unreadCount = await notificationService.getUnreadCount(session.user.id);

    return NextResponse.json({
      notifications,
      unreadCount,
      pagination: {
        limit: filters.limit,
        offset: filters.offset,
        hasMore: notifications.length === filters.limit,
      },
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Get notifications API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, notificationId } = body;

    if (action === 'mark_read' && notificationId) {
      const notification = await notificationService.markAsRead(
        notificationId,
        session.user.id
      );
      
      return NextResponse.json({
        message: 'Notificação marcada como lida',
        notification,
      });
    }

    if (action === 'mark_all_read') {
      const result = await notificationService.markAllAsRead(session.user.id);
      
      return NextResponse.json({
        message: 'Todas as notificações marcadas como lidas',
        count: result.count,
      });
    }

    if (action === 'delete' && notificationId) {
      await notificationService.deleteNotification(
        notificationId,
        session.user.id
      );
      
      return NextResponse.json({
        message: 'Notificação excluída',
      });
    }

    return NextResponse.json(
      { error: 'Ação inválida' },
      { status: 400 }
    );

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Notifications action API error:', error);
    }
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
