'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell, Check, X, AlertCircle, Info, CheckCircle, DollarSign, Gift, Users } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface NotificationData {
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'INVESTMENT' | 'REFERRAL' | 'LOTTERY';
    read: boolean;
    createdAt: string;
    actionUrl?: string;
    actionText?: string;
  }>;
  stats: {
    total: number;
    unread: number;
    today: number;
    thisWeek: number;
  };
}

export default function NotificationsPage() {
  const { data: session } = useSession();
  const [notificationData, setNotificationData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch('/api/user/notifications');
        if (!response.ok) {
          throw new Error('Erro ao carregar notificações');
        }
        const data = await response.json();
        setNotificationData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchNotifications();
    }
  }, [session]);

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/user/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Erro ao marcar como lida');
      }

      // Atualizar estado local
      setNotificationData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: prev.notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          ),
          stats: {
            ...prev.stats,
            unread: Math.max(0, prev.stats.unread - 1),
          },
        };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao marcar notificação como lida');
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/user/notifications/mark-all-read', {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Erro ao marcar todas como lidas');
      }

      // Atualizar estado local
      setNotificationData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          notifications: prev.notifications.map(n => ({ ...n, read: true })),
          stats: {
            ...prev.stats,
            unread: 0,
          },
        };
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao marcar todas as notificações como lidas');
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'WARNING':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'ERROR':
        return <X className="h-5 w-5 text-red-500" />;
      case 'INVESTMENT':
        return <DollarSign className="h-5 w-5 text-blue-500" />;
      case 'REFERRAL':
        return <Users className="h-5 w-5 text-purple-500" />;
      case 'LOTTERY':
        return <Gift className="h-5 w-5 text-orange-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'SUCCESS': return 'Sucesso';
      case 'WARNING': return 'Aviso';
      case 'ERROR': return 'Erro';
      case 'INVESTMENT': return 'Investimento';
      case 'REFERRAL': return 'Indicação';
      case 'LOTTERY': return 'Sorteio';
      default: return 'Informação';
    }
  };

  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'SUCCESS': return 'success';
      case 'WARNING': return 'warning';
      case 'ERROR': return 'destructive';
      case 'INVESTMENT': return 'default';
      case 'REFERRAL': return 'secondary';
      case 'LOTTERY': return 'outline';
      default: return 'outline';
    }
  };

  if (loading) {
    return <div className="p-6">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p>Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!notificationData) {
    return <div className="p-6">Nenhum dado encontrado</div>;
  }

  const { notifications, stats } = notificationData;

  // Filtrar notificações
  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    return true;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notificações</h1>
          <p className="text-gray-600">Central de mensagens e atualizações</p>
        </div>
        {stats.unread > 0 && (
          <Button onClick={markAllAsRead} variant="outline">
            <Check className="h-4 w-4 mr-2" />
            Marcar Todas como Lidas
          </Button>
        )}
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Bell className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.total}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Lidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.unread}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hoje</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.today}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
            <Info className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.thisWeek}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-4">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
        >
          Todas ({stats.total})
        </Button>
        <Button
          variant={filter === 'unread' ? 'default' : 'outline'}
          onClick={() => setFilter('unread')}
        >
          Não Lidas ({stats.unread})
        </Button>
        <Button
          variant={filter === 'read' ? 'default' : 'outline'}
          onClick={() => setFilter('read')}
        >
          Lidas ({stats.total - stats.unread})
        </Button>
      </div>

      {/* Lista de Notificações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Suas Notificações
          </CardTitle>
          <CardDescription>
            {filter === 'all' && `Mostrando todas as ${filteredNotifications.length} notificações`}
            {filter === 'unread' && `Mostrando ${filteredNotifications.length} notificações não lidas`}
            {filter === 'read' && `Mostrando ${filteredNotifications.length} notificações lidas`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação encontrada'}
              </h3>
              <p className="text-gray-600">
                {filter === 'unread' 
                  ? 'Você está em dia com todas as suas notificações!'
                  : 'Quando houver atualizações, elas aparecerão aqui.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 ${
                    !notification.read ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getNotificationIcon(notification.type)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-gray-700 mb-2">{notification.message}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant={getTypeVariant(notification.type)}>
                            {getTypeLabel(notification.type)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {formatDate(notification.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {notification.actionUrl && notification.actionText && (
                        <Button size="sm" variant="outline">
                          {notification.actionText}
                        </Button>
                      )}
                      {!notification.read && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
