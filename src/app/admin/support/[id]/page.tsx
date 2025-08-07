'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  Clock, 
  AlertCircle, 
  CheckCircle, 
  HelpCircle,
  User,
  MessageSquare,
  Send,
  Edit,
  UserPlus,
  AlertTriangle,
  RefreshCw,
  MoreHorizontal,
  Eye,
  EyeOff
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/utils';

interface TicketMessage {
  id: string;
  content: string;
  isInternal: boolean;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface TicketDetails {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  assignedAgent: {
    id: string;
    name: string;
    email: string;
  } | null;
  messages: TicketMessage[];
  auditLog: Array<{
    id: string;
    action: string;
    details: string;
    createdAt: string;
    user: {
      name: string;
      email: string;
    };
  }>;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  ticketsCount: number;
}

export default function AdminTicketDetailsPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;

  const [ticket, setTicket] = useState<TicketDetails | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para formulários
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [updatingTicket, setUpdatingTicket] = useState(false);
  
  // Estados para edição
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingPriority, setEditingPriority] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState(false);
  
  // Filtros de mensagens
  const [showInternalMessages, setShowInternalMessages] = useState(true);

  useEffect(() => {
    if (session?.user && ticketId) {
      fetchTicketDetails();
      fetchAgents();
    }
  }, [session, ticketId]);

  const fetchTicketDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/tickets/${ticketId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao carregar detalhes do ticket');
      }

      const data = await response.json();
      setTicket(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/admin/tickets/assignment');
      
      if (response.ok) {
        const data = await response.json();
        setAgents(data.agents || []);
      }
    } catch (err) {
      console.error('Erro ao carregar agentes:', err);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    try {
      setSendingMessage(true);
      const response = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          isInternal,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar mensagem');
      }

      setNewMessage('');
      setIsInternal(false);
      await fetchTicketDetails(); // Recarregar para mostrar nova mensagem
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar mensagem');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleUpdateTicket = async (field: string, value: string) => {
    try {
      setUpdatingTicket(true);
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [field]: value,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar ticket');
      }

      await fetchTicketDetails(); // Recarregar dados
      
      // Resetar estados de edição
      setEditingStatus(false);
      setEditingPriority(false);
      setEditingAssignment(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar ticket');
    } finally {
      setUpdatingTicket(false);
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

  const filteredMessages = ticket?.messages?.filter(message =>
    showInternalMessages || !message.isInternal
  ) || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/support">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Detalhes do Ticket</h1>
        </div>
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-600">Carregando detalhes...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/support">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Detalhes do Ticket</h1>
        </div>
        <div className="text-center py-12">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
          <p className="mt-2 text-red-600">Erro: {error || 'Ticket não encontrado'}</p>
          <Button onClick={fetchTicketDetails} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/support">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{ticket?.subject || 'Carregando...'}</h1>
            <p className="text-gray-600">Ticket #{ticket?.id?.slice(-8) || 'Carregando...'}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <MoreHorizontal className="h-4 w-4 mr-2" />
            Ações
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal - Conversação */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações do Ticket */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Ticket</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-900">Descrição</h4>
                  <p className="text-gray-600 mt-1">{ticket?.description || 'Carregando...'}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Usuário</h4>
                    <p className="text-gray-600">{ticket?.user?.name || 'Carregando...'}</p>
                    <p className="text-sm text-gray-500">{ticket?.user?.email || 'Carregando...'}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Criado em</h4>
                    <p className="text-gray-600">{ticket?.createdAt ? formatDate(ticket.createdAt) : 'Carregando...'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversação */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Conversação</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInternalMessages(!showInternalMessages)}
                >
                  {showInternalMessages ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Ocultar Internas
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Mostrar Internas
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {filteredMessages.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Nenhuma mensagem encontrada</p>
                ) : (
                  filteredMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-4 rounded-lg ${
                        message.isInternal
                          ? 'bg-yellow-50 border-l-4 border-yellow-400'
                          : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <span className="font-medium text-gray-900">
                            {message.author.name}
                          </span>
                          {message.isInternal && (
                            <Badge variant="outline" className="text-xs">
                              Interna
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {message.content}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Formulário de Resposta */}
          <Card>
            <CardHeader>
              <CardTitle>Nova Mensagem</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={4}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="internal"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="internal" className="text-sm text-gray-600">
                      Mensagem interna (apenas para agentes)
                    </label>
                  </div>
                  <Button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                  >
                    {sendingMessage ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Enviar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Coluna Lateral - Ações e Status */}
        <div className="space-y-6">
          {/* Status e Prioridade */}
          <Card>
            <CardHeader>
              <CardTitle>Status e Prioridade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <div className="flex items-center gap-2">
                    {ticket?.status ? getStatusIcon(ticket.status) : <HelpCircle className="h-4 w-4 text-gray-500" />}
                    <span className="text-sm">{ticket?.status ? getStatusLabel(ticket.status) : 'Carregando...'}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingStatus(!editingStatus)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {editingStatus && ticket?.status && (
                  <Select
                    value={ticket.status}
                    onValueChange={(value: string) => handleUpdateTicket('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN">Aberto</SelectItem>
                      <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                      <SelectItem value="RESOLVED">Resolvido</SelectItem>
                      <SelectItem value="CLOSED">Fechado</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Prioridade</span>
                  <div className="flex items-center gap-2">
                    <Badge variant={ticket?.priority ? getPriorityVariant(ticket.priority) : 'secondary'}>
                      {ticket?.priority ? getPriorityLabel(ticket.priority) : 'Carregando...'}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingPriority(!editingPriority)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {editingPriority && ticket?.priority && (
                  <Select
                    value={ticket.priority}
                    onValueChange={(value: string) => handleUpdateTicket('priority', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Baixa</SelectItem>
                      <SelectItem value="MEDIUM">Média</SelectItem>
                      <SelectItem value="HIGH">Alta</SelectItem>
                      <SelectItem value="URGENT">Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Agente</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">
                      {ticket?.assignedAgent ? ticket.assignedAgent.name : 'Não atribuído'}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingAssignment(!editingAssignment)}
                    >
                      <UserPlus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                {editingAssignment && ticket && (
                  <Select
                    value={ticket.assignedTo || 'unassigned'}
                    onValueChange={(value: string) =>
                      handleUpdateTicket('assignedTo', value === 'unassigned' ? '' : value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Não atribuído</SelectItem>
                      {agents.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name} ({agent.ticketsCount} tickets)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Auditoria */}
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Mudanças</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {ticket.auditLog && ticket.auditLog.length > 0 ? (
                  ticket.auditLog.map((log) => (
                    <div key={log.id} className="text-sm">
                      <p className="font-medium text-gray-900">{log.action}</p>
                      <p className="text-gray-600">{log.details}</p>
                      <p className="text-xs text-gray-500">
                        {log.user.name} • {formatDate(log.createdAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">Nenhuma mudança registrada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
