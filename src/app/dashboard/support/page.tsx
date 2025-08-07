'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { MessageCircle, Plus, Search, Clock, CheckCircle, AlertCircle, HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';

interface SupportData {
  tickets: Array<{
    id: string;
    subject: string;
    description: string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    createdAt: string;
    updatedAt: string;
    messages: Array<{
      id: string;
      content: string;
      isFromUser: boolean;
      createdAt: string;
      author: string;
    }>;
  }>;
  stats: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    avgResponseTime: string;
  };
  faq: Array<{
    id: string;
    question: string;
    answer: string;
    category: string;
  }>;
}

export default function SupportPage() {
  const { data: session } = useSession();
  const [supportData, setSupportData] = useState<SupportData | null>(null);
  const [filteredTickets, setFilteredTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all' as 'all' | 'OPEN' | 'CLOSED' | 'IN_PROGRESS' | 'RESOLVED',
    priority: 'all' as 'all' | 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
  });
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'MEDIUM' as const,
  });

  useEffect(() => {
    const fetchSupportData = async () => {
      try {
        const response = await fetch('/api/user/tickets');
        if (!response.ok) {
          throw new Error('Erro ao carregar dados do suporte');
        }
        const data = await response.json();

        // Adaptar dados para o formato esperado
        const adaptedData = {
          tickets: data.tickets.map((ticket: any) => ({
            id: ticket.id,
            subject: ticket.subject,
            description: ticket.description,
            status: ticket.status,
            priority: ticket.priority,
            createdAt: ticket.createdAt,
            updatedAt: ticket.updatedAt,
            messages: ticket.recentMessages.map((msg: any) => ({
              id: msg.id,
              content: msg.message,
              isFromUser: msg.isFromUser,
              createdAt: msg.createdAt,
              author: msg.isFromUser ? 'Você' : 'Suporte',
            })),
          })),
          stats: {
            totalTickets: data.summary.totalTickets,
            openTickets: data.summary.openTickets,
            resolvedTickets: data.summary.totalTickets - data.summary.openTickets,
            avgResponseTime: '2h',
          },
          faq: [
            {
              id: '1',
              question: 'Como posso investir em uma oportunidade?',
              answer: 'Para investir, acesse a seção de Oportunidades, escolha uma oportunidade ativa e clique em "Investir". Você precisará ter sua conta verificada (KYC) e saldo suficiente.',
              category: 'investimentos',
            },
            {
              id: '2',
              question: 'Como funciona o sistema de indicações?',
              answer: 'Compartilhe seu código de indicação com amigos. Quando eles se cadastrarem e fizerem o primeiro investimento, você receberá um bônus.',
              category: 'indicacoes',
            },
            {
              id: '3',
              question: 'Quando recebo os retornos dos investimentos?',
              answer: 'Os retornos são distribuídos conforme especificado em cada oportunidade. Você será notificado quando houver distribuições.',
              category: 'retornos',
            },
          ],
        };

        setSupportData(adaptedData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user) {
      fetchSupportData();
    }
  }, [session]);

  // Filtrar tickets quando os dados ou filtros mudarem
  useEffect(() => {
    if (!supportData?.tickets) {
      setFilteredTickets([]);
      return;
    }

    let filtered = supportData.tickets;

    // Filtrar por status
    if (filters.status !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }

    // Filtrar por prioridade
    if (filters.priority !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority);
    }

    setFilteredTickets(filtered);
  }, [supportData, filters]);

  const handleFilterChange = (type: 'status' | 'priority', value: string) => {
    setFilters(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  const handleCreateTicket = async () => {
    try {
      const response = await fetch('/api/user/tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newTicket),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar ticket');
      }

      const result = await response.json();

      // Resetar formulário e recarregar dados
      setNewTicket({ subject: '', description: '', priority: 'MEDIUM' });
      setShowNewTicket(false);

      // Mostrar mensagem de sucesso
      alert(result.message || 'Ticket criado com sucesso!');

      // Recarregar dados
      window.location.reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao criar ticket');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'IN_PROGRESS':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'RESOLVED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'CLOSED':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'OPEN': return 'Aberto';
      case 'IN_PROGRESS': return 'Em Andamento';
      case 'RESOLVED': return 'Resolvido';
      case 'CLOSED': return 'Fechado';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'Baixa';
      case 'MEDIUM': return 'Média';
      case 'HIGH': return 'Alta';
      case 'URGENT': return 'Urgente';
      default: return priority;
    }
  };

  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'secondary';
      case 'MEDIUM': return 'outline';
      case 'HIGH': return 'warning';
      case 'URGENT': return 'destructive';
      default: return 'secondary';
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

  if (!supportData) {
    return <div className="p-6">Nenhum dado encontrado</div>;
  }

  const { stats, faq } = supportData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Central de Suporte</h1>
          <p className="text-gray-600">Obtenha ajuda e suporte para suas dúvidas</p>
        </div>
        <Button onClick={() => setShowNewTicket(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Ticket
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalTickets}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.openTickets}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tickets Resolvidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.resolvedTickets}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.avgResponseTime}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Formulário de Novo Ticket */}
      {showNewTicket && (
        <Card>
          <CardHeader>
            <CardTitle>Criar Novo Ticket</CardTitle>
            <CardDescription>Descreva sua dúvida ou problema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Assunto
              </label>
              <Input
                value={newTicket.subject}
                onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Descreva brevemente o problema..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Descrição
              </label>
              <Textarea
                value={newTicket.description}
                onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Descreva detalhadamente sua dúvida ou problema..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Prioridade
              </label>
              <select
                value={newTicket.priority}
                onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value as any })}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleCreateTicket} disabled={!newTicket.subject || !newTicket.description}>
                Criar Ticket
              </Button>
              <Button variant="outline" onClick={() => setShowNewTicket(false)}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Seus Tickets
          </CardTitle>
          <CardDescription>Histórico de solicitações de suporte</CardDescription>

          {/* Filtros */}
          <div className="flex gap-4 mt-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Status</label>
              <select
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">Todos</option>
                <option value="OPEN">Aberto</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="RESOLVED">Resolvido</option>
                <option value="CLOSED">Fechado</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Prioridade</label>
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">Todas</option>
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {supportData?.tickets.length === 0 ? 'Nenhum ticket encontrado' : 'Nenhum ticket corresponde aos filtros'}
              </h3>
              <p className="text-gray-600">
                {supportData?.tickets.length === 0
                  ? 'Crie seu primeiro ticket para obter suporte!'
                  : 'Tente ajustar os filtros para ver mais tickets.'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div key={ticket.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(ticket.status)}
                        <Link href={`/dashboard/support/${ticket.id}`}>
                          <h4 className="font-semibold text-gray-900 hover:text-blue-600 cursor-pointer">{ticket.subject}</h4>
                        </Link>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{ticket.description}</p>
                      <p className="text-xs text-gray-500">
                        Criado em {formatDate(ticket.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Badge variant={getPriorityVariant(ticket.priority)}>
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                      <Badge variant="outline">
                        {getStatusLabel(ticket.status)}
                      </Badge>
                    </div>
                  </div>

                  {/* Últimas mensagens */}
                  {ticket.messages.length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Última resposta:
                      </p>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-800">
                          {ticket.messages[0].content}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {ticket.messages[0].author} • {formatDate(ticket.messages[0].createdAt)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Perguntas Frequentes
          </CardTitle>
          <CardDescription>Respostas para as dúvidas mais comuns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {faq.map((item) => (
              <div key={item.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                <h4 className="font-semibold text-gray-900 mb-2">{item.question}</h4>
                <p className="text-gray-600 text-sm">{item.answer}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
