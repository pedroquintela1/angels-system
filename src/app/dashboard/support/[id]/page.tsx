'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send, Clock, CheckCircle, AlertCircle, HelpCircle, MessageCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

interface TicketData {
  ticket: {
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
    messagesCount: number;
    isOpen: boolean;
    canAddMessage: boolean;
    messages: Array<{
      id: string;
      message: string;
      isFromUser: boolean;
      authorId: string | null;
      createdAt: string;
      author: string;
    }>;
  };
}

export default function TicketDetailPage() {
  const { data: session } = useSession();
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const { toast } = useToast();

  const [ticketData, setTicketData] = useState<TicketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  useEffect(() => {
    const fetchTicketData = async () => {
      try {
        const response = await fetch(`/api/user/tickets/${ticketId}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Ticket não encontrado');
          }
          throw new Error('Erro ao carregar dados do ticket');
        }
        const data = await response.json();
        setTicketData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    if (session?.user && ticketId) {
      fetchTicketData();
    }
  }, [session, ticketId]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return;

    setSendingMessage(true);
    try {
      const response = await fetch(`/api/user/tickets/${ticketId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao enviar mensagem');
      }

      const result = await response.json();
      
      // Atualizar dados do ticket
      if (ticketData) {
        setTicketData({
          ...ticketData,
          ticket: {
            ...ticketData.ticket,
            messages: [...ticketData.ticket.messages, result.message],
            messagesCount: ticketData.ticket.messagesCount + 1,
            status: result.ticket.status,
            updatedAt: result.ticket.updatedAt,
            canAddMessage: result.ticket.canAddMessage,
          },
        });
      }
      
      setNewMessage('');
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar mensagem",
        description: err instanceof Error ? err.message : 'Erro ao enviar mensagem',
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!confirm('Tem certeza que deseja fechar este ticket?')) return;

    try {
      const response = await fetch(`/api/user/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'close',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fechar ticket');
      }

      const result = await response.json();
      
      // Atualizar dados do ticket
      if (ticketData) {
        setTicketData({
          ...ticketData,
          ticket: {
            ...ticketData.ticket,
            status: result.ticket.status,
            updatedAt: result.ticket.updatedAt,
            isOpen: result.ticket.isOpen,
            canAddMessage: result.ticket.canAddMessage,
          },
        });
      }
      
      toast({
        variant: "success",
        title: "Sucesso!",
        description: result.message || 'Ticket fechado com sucesso!',
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Erro ao fechar ticket",
        description: err instanceof Error ? err.message : 'Erro ao fechar ticket',
      });
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
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/support')}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Suporte
          </Button>
        </div>
      </div>
    );
  }

  if (!ticketData) {
    return <div className="p-6">Nenhum dado encontrado</div>;
  }

  const { ticket } = ticketData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            onClick={() => router.push('/dashboard/support')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ticket.subject}</h1>
            <p className="text-gray-600">Ticket #{ticket.id.slice(-8)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getPriorityVariant(ticket.priority)}>
            {getPriorityLabel(ticket.priority)}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {getStatusIcon(ticket.status)}
            {getStatusLabel(ticket.status)}
          </Badge>
        </div>
      </div>

      {/* Informações do Ticket */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes do Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Descrição</h4>
            <p className="text-gray-700">{ticket.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-600">Criado em:</span>
              <p>{formatDate(ticket.createdAt)}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">Última atualização:</span>
              <p>{formatDate(ticket.updatedAt)}</p>
            </div>
          </div>
          {ticket.assignedTo && (
            <div>
              <span className="font-medium text-gray-600">Atribuído para:</span>
              <p>Agente de Suporte</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conversação */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversação ({ticket.messagesCount} mensagens)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {ticket.messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isFromUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.isFromUser
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p className={`text-xs mt-1 ${
                    message.isFromUser ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.author} • {formatDate(message.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Nova Mensagem */}
      {ticket.canAddMessage && (
        <Card>
          <CardHeader>
            <CardTitle>Adicionar Mensagem</CardTitle>
            <CardDescription>
              Envie uma mensagem para continuar a conversa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
              >
                <Send className="h-4 w-4 mr-2" />
                {sendingMessage ? 'Enviando...' : 'Enviar Mensagem'}
              </Button>
              {ticket.isOpen && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      Fechar Ticket
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar fechamento do ticket</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja fechar este ticket? Esta ação não pode ser desfeita.
                        Após o fechamento, você não poderá mais enviar mensagens neste ticket.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCloseTicket}>
                        Fechar Ticket
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ticket Fechado */}
      {!ticket.canAddMessage && (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ticket {ticket.status === 'CLOSED' ? 'Fechado' : 'Resolvido'}
            </h3>
            <p className="text-gray-600">
              {ticket.status === 'CLOSED' 
                ? 'Este ticket foi fechado e não aceita mais mensagens.'
                : 'Este ticket foi marcado como resolvido.'
              }
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
