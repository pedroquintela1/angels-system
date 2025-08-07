import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { Resource, Action } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';

export const GET = withAuth(
  async (request: NextRequest, user) => {
    try {

    // Dados simulados para suporte (modelo SupportTicket não existe ainda)
    const tickets: any[] = [];
    
    // Estatísticas simuladas
    const stats = {
      totalTickets: 0,
      openTickets: 0,
      resolvedTickets: 0,
      avgResponseTime: '2h',
    };

    // FAQ simulado
    const faq = [
      {
        id: '1',
        question: 'Como faço para investir em uma oportunidade?',
        answer: 'Para investir, acesse a página de Oportunidades, escolha um projeto e clique em "Investir". Você precisará ter KYC aprovado e membership ativo.',
        category: 'Investimentos',
      },
      {
        id: '2',
        question: 'Quando recebo os retornos dos meus investimentos?',
        answer: 'Os retornos são distribuídos conforme o cronograma de cada projeto. Você pode acompanhar as datas na página de Investimentos.',
        category: 'Investimentos',
      },
      {
        id: '3',
        question: 'Como funciona o sistema de indicações?',
        answer: 'Compartilhe seu código de referência com amigos. Quando eles se cadastram e fazem investimentos, você ganha bônus conforme seu nível.',
        category: 'Indicações',
      },
      {
        id: '4',
        question: 'Posso cancelar meu membership?',
        answer: 'Sim, você pode cancelar a qualquer momento. Entre em contato conosco através de um ticket de suporte.',
        category: 'Membership',
      },
      {
        id: '5',
        question: 'Como participar dos sorteios?',
        answer: 'Membros ativos com KYC aprovado e pelo menos 1 investimento ativo participam automaticamente dos sorteios mensais.',
        category: 'Sorteios',
      },
      {
        id: '6',
        question: 'Meus dados estão seguros?',
        answer: 'Sim! Utilizamos criptografia de ponta e seguimos todas as normas de segurança bancária e LGPD para proteger seus dados.',
        category: 'Segurança',
      },
      {
        id: '7',
        question: 'Como atualizar meus dados pessoais?',
        answer: 'Acesse a página de Perfil para atualizar informações como nome, telefone e endereço. Email e CPF não podem ser alterados.',
        category: 'Conta',
      },
      {
        id: '8',
        question: 'Qual o valor mínimo para investir?',
        answer: 'O valor mínimo varia por oportunidade, geralmente entre R$ 500 e R$ 2.000. Consulte cada projeto na página de Oportunidades.',
        category: 'Investimentos',
      },
    ];

    const supportData = {
      tickets,
      stats,
      faq,
    };

    return NextResponse.json(supportData);

    } catch (error) {
      console.error('Support fetch error:', error);
      return NextResponse.json(
        { error: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  },
  {
    resource: Resource.SUPPORT_TICKETS,
    action: Action.READ,
  }
);
