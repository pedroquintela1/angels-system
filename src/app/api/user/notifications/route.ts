import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
// import { prisma } from '@/lib/prisma';

export const GET = withAuth(
  async (/* request: NextRequest, user */) => {
    try {

    // Dados simulados para notificações (modelo Notification não existe ainda)
    const notifications = [
      {
        id: '1',
        title: 'Bem-vindo ao Angels System!',
        message: 'Sua conta foi criada com sucesso. Complete seu perfil para começar a investir.',
        type: 'SUCCESS',
        read: false,
        createdAt: new Date().toISOString(),
        actionUrl: '/dashboard/profile',
        actionText: 'Completar Perfil',
      },
      {
        id: '2',
        title: 'Membership Ativo',
        message: 'Seu membership foi ativado com sucesso. Agora você pode acessar todas as funcionalidades.',
        type: 'SUCCESS',
        read: true,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 dia atrás
      },
      {
        id: '3',
        title: 'Nova Oportunidade Disponível',
        message: 'Uma nova oportunidade de investimento está disponível: Centro Comercial Campinas.',
        type: 'INVESTMENT',
        read: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 horas atrás
        actionUrl: '/dashboard/opportunities',
        actionText: 'Ver Oportunidades',
      },
      {
        id: '4',
        title: 'Sorteio de Janeiro Aberto',
        message: 'O sorteio mensal de Janeiro está aberto! Concorra a R$ 10.000 em prêmios.',
        type: 'LOTTERY',
        read: false,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 horas atrás
        actionUrl: '/dashboard/lotteries',
        actionText: 'Participar',
      },
      {
        id: '5',
        title: 'Sistema de Indicações',
        message: 'Compartilhe seu código de indicação e ganhe bônus por cada amigo que se cadastrar.',
        type: 'REFERRAL',
        read: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 dias atrás
        actionUrl: '/dashboard/referrals',
        actionText: 'Ver Código',
      },
      {
        id: '6',
        title: 'Documentação Pendente',
        message: 'Complete seu processo de KYC enviando os documentos necessários.',
        type: 'WARNING',
        read: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 dias atrás
        actionUrl: '/dashboard/profile',
        actionText: 'Enviar Documentos',
      },
      {
        id: '7',
        title: 'Atualização do Sistema',
        message: 'Novas funcionalidades foram adicionadas ao sistema. Explore as melhorias!',
        type: 'INFO',
        read: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 dias atrás
      },
    ];

    // Calcular estatísticas
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      today: notifications.filter(n => new Date(n.createdAt) >= today).length,
      thisWeek: notifications.filter(n => new Date(n.createdAt) >= thisWeek).length,
    };

    const notificationData = {
      notifications: notifications.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
      stats,
    };

    return NextResponse.json(notificationData);

    } catch (error) {
      console.error('Notifications fetch error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.NOTIFICATIONS,
    action: Action.READ,
    requireAuth: true,
    ownershipCheck: false,
  }
);
