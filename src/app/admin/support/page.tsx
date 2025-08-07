'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  Search,
  MoreHorizontal,
  Clock,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Users,
  MessageSquare,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  UserPlus,
  Settings,
  Eye,
  Edit,
  Trash2,
  UserCheck
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate } from '@/lib/utils';

interface TicketStats {
  overview: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    urgentTickets: number;
    unassignedTickets: number;
    averageResolutionHours: number;
  };
  performance: {
    resolutionRate: number;
    responseRate: number;
    urgentRate: number;
    assignmentRate: number;
    averageTicketsPerAgent: number;
  };
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    agentEmail: string;
    ticketsCount: number;
  }>;
  alerts: {
    highUrgentTickets: boolean;
    highUnassignedTickets: boolean;
    slowResolution: boolean;
    highOpenTickets: boolean;
  };
}

interface Ticket {
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
  messagesCount: number;
  hasUnreadMessages: boolean;
  isOpen: boolean;
  needsAttention: boolean;
  isUnassigned: boolean;
  ageInHours: number;
}

interface TicketsData {
  tickets: Ticket[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  statistics: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    urgent: number;
    unassigned: number;
    needsAttention: number;
  };
}

export default function AdminSupportPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [ticketsData, setTicketsData] = useState<TicketsData | null>(null);
  const [allTickets, setAllTickets] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    assignedTo: '',
    page: 1,
    limit: 20,
  });
  
  // Seleção múltipla
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);

  // Estados para modais
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [assignToAgent, setAssignToAgent] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [processing, setProcessing] = useState(false);

  // Carregar dados iniciais apenas uma vez
  useEffect(() => {
    if (session?.user) {
      fetchData();
    }
  }, [session]);

  // Aplicar filtros localmente sem recarregar da API
  useEffect(() => {
    if (!allTickets.length) return;

    let filtered = [...allTickets];

    if (filters.search) {
      filtered = filtered.filter(ticket =>
        ticket.subject.toLowerCase().includes(filters.search.toLowerCase()) ||
        (typeof ticket.user === 'string' ? ticket.user : ticket.user?.name || '').toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.status && filters.status !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filters.status);
    }

    if (filters.priority && filters.priority !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === filters.priority);
    }

    if (filters.assignedTo && filters.assignedTo !== 'all') {
      if (filters.assignedTo === 'unassigned') {
        filtered = filtered.filter(ticket => !ticket.assignedTo);
      } else {
        filtered = filtered.filter(ticket => ticket.assignedTo === filters.assignedTo);
      }
    }

    setTickets(filtered);
  }, [allTickets, filters]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Buscar estatísticas e todos os tickets (sem filtros para cache local)
      const [statsResponse, ticketsResponse] = await Promise.all([
        fetch('/api/admin/tickets/stats'),
        fetch('/api/admin/tickets?limit=1000'), // Carregar todos os tickets
      ]);

      if (!statsResponse.ok || !ticketsResponse.ok) {
        throw new Error('Erro ao carregar dados');
      }

      const [statsData, ticketsData] = await Promise.all([
        statsResponse.json(),
        ticketsResponse.json(),
      ]);

      setStats(statsData);
      setTicketsData(ticketsData);

      // Armazenar todos os tickets para filtragem local
      if (ticketsData?.tickets) {
        setAllTickets(ticketsData.tickets);
        setTickets(ticketsData.tickets); // Inicialmente mostrar todos
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Função simplificada para atualizar filtros
  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSelectTicket = (ticketId: string) => {
    setSelectedTickets(prev => 
      prev.includes(ticketId) 
        ? prev.filter(id => id !== ticketId)
        : [...prev, ticketId]
    );
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTickets([]);
    } else {
      setSelectedTickets(tickets.map(t => t.id) || []);
    }
    setSelectAll(!selectAll);
  };

  // Funções para ações em lote
  const handleBulkAssign = async () => {
    if (!assignToAgent || selectedTickets.length === 0) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/tickets/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds: selectedTickets,
          assignedTo: assignToAgent === 'unassigned' ? null : assignToAgent,
        }),
      });

      if (response.ok) {
        // Atualizar apenas os tickets afetados localmente
        const updatedTickets = allTickets.map(ticket =>
          selectedTickets.includes(ticket.id)
            ? { ...ticket, assignedTo: assignToAgent === 'unassigned' ? null : assignToAgent }
            : ticket
        );
        setAllTickets(updatedTickets);

        setSelectedTickets([]);
        setSelectAll(false);
        setShowAssignModal(false);
        setAssignToAgent('');
      } else {
        throw new Error('Erro ao atribuir tickets');
      }
    } catch (error) {
      console.error('Erro ao atribuir tickets:', error);
      setError('Erro ao atribuir tickets');
    } finally {
      setProcessing(false);
    }
  };

  const handleBulkStatusChange = async () => {
    if (!newStatus || selectedTickets.length === 0) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/tickets/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketIds: selectedTickets,
          status: newStatus,
        }),
      });

      if (response.ok) {
        // Atualizar apenas os tickets afetados localmente
        const updatedTickets = allTickets.map(ticket =>
          selectedTickets.includes(ticket.id)
            ? { ...ticket, status: newStatus }
            : ticket
        );
        setAllTickets(updatedTickets);

        setSelectedTickets([]);
        setSelectAll(false);
        setShowStatusModal(false);
        setNewStatus('');
      } else {
        throw new Error('Erro ao alterar status dos tickets');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      setError('Erro ao alterar status dos tickets');
    } finally {
      setProcessing(false);
    }
  };

  // Funções para ações individuais
  const handleViewTicket = (ticketId: string) => {
    window.open(`/admin/support/${ticketId}`, '_blank');
  };

  const handleAssignTicket = async (ticketId: string, agentId: string) => {
    try {
      const response = await fetch('/api/admin/tickets/assignment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId,
          agentId,
        }),
      });

      if (response.ok) {
        // Atualizar ticket localmente
        const updatedTickets = allTickets.map(ticket =>
          ticket.id === ticketId
            ? { ...ticket, assignedTo: agentId }
            : ticket
        );
        setAllTickets(updatedTickets);
      } else {
        throw new Error('Erro ao atribuir ticket');
      }
    } catch (error) {
      console.error('Erro ao atribuir ticket:', error);
      setError('Erro ao atribuir ticket');
    }
  };

  const handleChangeStatus = async (ticketId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        // Atualizar ticket localmente
        const updatedTickets = allTickets.map(ticket =>
          ticket.id === ticketId
            ? { ...ticket, status }
            : ticket
        );
        setAllTickets(updatedTickets);
      } else {
        throw new Error('Erro ao alterar status');
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      setError('Erro ao alterar status do ticket');
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
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Suporte</h1>
        </div>
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-600">Carregando dados...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Suporte</h1>
        </div>
        <div className="text-center py-12">
          <AlertTriangle className="h-8 w-8 mx-auto text-red-500" />
          <p className="mt-2 text-red-600">Erro: {error}</p>
          <Button onClick={fetchData} className="mt-4">
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
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Suporte</h1>
          <p className="text-gray-600">Gerencie tickets e atendimento ao cliente</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowConfigModal(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
          <Button onClick={() => setShowAssignModal(true)} disabled={selectedTickets.length === 0}>
            <UserPlus className="h-4 w-4 mr-2" />
            Atribuir Tickets {selectedTickets.length > 0 && `(${selectedTickets.length})`}
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Tickets</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.overview.totalTickets}</div>
              <p className="text-xs text-muted-foreground">
                {stats.overview.unassignedTickets} não atribuídos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Abertos</CardTitle>
              <AlertCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.overview.openTickets + stats.overview.inProgressTickets}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.overview.urgentTickets} urgentes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Resolução</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.performance.resolutionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Tempo médio: {stats.overview.averageResolutionHours}h
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Agentes Ativos</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.agentPerformance.length}
              </div>
              <p className="text-xs text-muted-foreground">
                Média: {stats.performance.averageTicketsPerAgent.toFixed(1)} tickets/agente
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alertas */}
      {stats?.alerts && Object.values(stats.alerts).some(Boolean) && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Alertas do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.alerts.highUrgentTickets && (
                <p className="text-sm text-yellow-700">⚠️ Muitos tickets urgentes pendentes</p>
              )}
              {stats.alerts.highUnassignedTickets && (
                <p className="text-sm text-yellow-700">⚠️ Muitos tickets não atribuídos</p>
              )}
              {stats.alerts.slowResolution && (
                <p className="text-sm text-yellow-700">⚠️ Tempo de resolução acima do esperado</p>
              )}
              {stats.alerts.highOpenTickets && (
                <p className="text-sm text-yellow-700">⚠️ Volume alto de tickets abertos</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros e Lista de Tickets */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tickets</CardTitle>
            <div className="flex items-center gap-2">
              {selectedTickets.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {selectedTickets.length} selecionados
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAssignModal(true)}
                  >
                    Atribuir
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowStatusModal(true)}
                  >
                    Alterar Status
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar tickets..."
                  value={filters.search}
                  onChange={(e) => updateFilter('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={filters.status} onValueChange={(value: string) => updateFilter('status', value === 'all' ? '' : value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="OPEN">Aberto</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                <SelectItem value="RESOLVED">Resolvido</SelectItem>
                <SelectItem value="CLOSED">Fechado</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.priority} onValueChange={(value: string) => updateFilter('priority', value === 'all' ? '' : value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="LOW">Baixa</SelectItem>
                <SelectItem value="MEDIUM">Média</SelectItem>
                <SelectItem value="HIGH">Alta</SelectItem>
                <SelectItem value="URGENT">Urgente</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.assignedTo} onValueChange={(value: string) => updateFilter('assignedTo', value === 'all' ? '' : value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unassigned">Não atribuídos</SelectItem>
                {stats?.agentPerformance.map((agent) => (
                  <SelectItem key={agent.agentId} value={agent.agentId}>
                    {agent.agentName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>

          {/* Lista de Tickets */}
          {ticketsData && (
            <div className="space-y-4">
              {/* Header da tabela */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={selectAll}
                  onCheckedChange={handleSelectAll}
                />
                <div className="flex-1 grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-4">Ticket</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-2">Prioridade</div>
                  <div className="col-span-2">Agente</div>
                  <div className="col-span-1">Idade</div>
                  <div className="col-span-1">Ações</div>
                </div>
              </div>

              {/* Tickets */}
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${
                    ticket.needsAttention ? 'border-red-200 bg-red-50' : 'border-gray-200'
                  }`}
                >
                  <Checkbox
                    checked={selectedTickets.includes(ticket.id)}
                    onCheckedChange={() => handleSelectTicket(ticket.id)}
                  />

                  <div className="flex-1 grid grid-cols-12 gap-4">
                    {/* Ticket Info */}
                    <div className="col-span-4">
                      <Link href={`/admin/support/${ticket.id}`}>
                        <div className="cursor-pointer">
                          <h4 className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1">
                            {ticket.subject}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-1">
                            {ticket.user.name} • {ticket.user.email}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(ticket.createdAt)}
                          </p>
                        </div>
                      </Link>
                    </div>

                    {/* Status */}
                    <div className="col-span-2 flex items-center gap-2">
                      {getStatusIcon(ticket.status)}
                      <span className="text-sm">{getStatusLabel(ticket.status)}</span>
                      {ticket.hasUnreadMessages && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                    </div>

                    {/* Priority */}
                    <div className="col-span-2">
                      <Badge variant={getPriorityVariant(ticket.priority)}>
                        {getPriorityLabel(ticket.priority)}
                      </Badge>
                    </div>

                    {/* Agent */}
                    <div className="col-span-2">
                      {ticket.assignedAgent ? (
                        <div className="text-sm">
                          <p className="font-medium">{ticket.assignedAgent.name}</p>
                          <p className="text-gray-500 text-xs">{ticket.assignedAgent.email}</p>
                        </div>
                      ) : (
                        <Badge variant="outline">Não atribuído</Badge>
                      )}
                    </div>

                    {/* Age */}
                    <div className="col-span-1">
                      <span className="text-sm text-gray-600">
                        {ticket.ageInHours < 24
                          ? `${ticket.ageInHours}h`
                          : `${Math.floor(ticket.ageInHours / 24)}d`
                        }
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleViewTicket(ticket.id)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Visualizar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeStatus(ticket.id, 'IN_PROGRESS')}>
                            <Clock className="mr-2 h-4 w-4" />
                            Marcar em Andamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleChangeStatus(ticket.id, 'RESOLVED')}>
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Marcar como Resolvido
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleChangeStatus(ticket.id, 'CLOSED')}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Fechar Ticket
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}

              {/* Mensagem quando não há tickets */}
              {tickets.length === 0 && !loading && (
                <div className="text-center py-8">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum ticket encontrado</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Tente ajustar os filtros ou aguarde novos tickets serem criados.
                  </p>
                </div>
              )}

              {/* Informações dos resultados */}
              {tickets.length > 0 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    Mostrando {tickets.length} de {allTickets.length} tickets
                  </p>
                  <Button variant="outline" onClick={fetchData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recarregar Dados
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Configurações */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações do Sistema de Suporte</DialogTitle>
            <DialogDescription>
              Configure as opções do sistema de atendimento ao cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Configurações Gerais</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Auto-atribuição</p>
                    <p className="text-xs text-gray-500">Atribuir automaticamente novos tickets</p>
                  </div>
                  <Checkbox />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Notificações por email</p>
                    <p className="text-xs text-gray-500">Enviar notificações para agentes</p>
                  </div>
                  <Checkbox />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Resposta automática</p>
                    <p className="text-xs text-gray-500">Enviar confirmação de recebimento</p>
                  </div>
                  <Checkbox defaultChecked />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-medium">SLA (Acordo de Nível de Serviço)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Resposta inicial</label>
                  <Select defaultValue="2">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 hora</SelectItem>
                      <SelectItem value="2">2 horas</SelectItem>
                      <SelectItem value="4">4 horas</SelectItem>
                      <SelectItem value="8">8 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Resolução</label>
                  <Select defaultValue="24">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8 horas</SelectItem>
                      <SelectItem value="24">24 horas</SelectItem>
                      <SelectItem value="48">48 horas</SelectItem>
                      <SelectItem value="72">72 horas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setShowConfigModal(false)}>
              Salvar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Atribuição */}
      <Dialog open={showAssignModal} onOpenChange={setShowAssignModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir Tickets</DialogTitle>
            <DialogDescription>
              Atribuir {selectedTickets.length} ticket(s) selecionado(s) para um agente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={assignToAgent} onValueChange={setAssignToAgent}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um agente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Não atribuído</SelectItem>
                <SelectItem value="admin@angelssystem.com">Super Admin</SelectItem>
                <SelectItem value="suporte@angelssystem.com">Agente Suporte</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAssignModal(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={processing || !assignToAgent}
            >
              {processing ? 'Atribuindo...' : 'Atribuir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Alteração de Status */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status</DialogTitle>
            <DialogDescription>
              Alterar o status de {selectedTickets.length} ticket(s) selecionado(s).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OPEN">Aberto</SelectItem>
                <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                <SelectItem value="RESOLVED">Resolvido</SelectItem>
                <SelectItem value="CLOSED">Fechado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowStatusModal(false)}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleBulkStatusChange}
              disabled={processing || !newStatus}
            >
              {processing ? 'Alterando...' : 'Alterar Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
