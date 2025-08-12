'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  DollarSign,
  Users,
  Calendar,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  minInvestment: number;
  expectedReturn?: number;
  endDate?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
  category?: string;
  riskLevel?: 'low' | 'medium' | 'high';
  investorCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface OpportunityStats {
  overview: {
    totalOpportunities: number;
    totalInvestments: number;
    totalCapturedAmount: number;
    totalTargetAmount: number;
    overallCompletionRate: number;
    averageInvestmentSize: number;
  };
  byStatus: {
    DRAFT: { count: number; totalTarget: number; totalCaptured: number };
    ACTIVE: { count: number; totalTarget: number; totalCaptured: number };
    CLOSED: { count: number; totalTarget: number; totalCaptured: number };
    COMPLETED: { count: number; totalTarget: number; totalCaptured: number };
    CANCELLED: { count: number; totalTarget: number; totalCaptured: number };
  };
  performance: {
    successRate: number;
    activeRate: number;
    cancellationRate: number;
    averageTargetAmount: number;
    averageCapturedAmount: number;
  };
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<OpportunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedOpportunity, setSelectedOpportunity] =
    useState<Opportunity | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type:
      | 'approve'
      | 'reject'
      | 'close'
      | 'delete'
      | 'reopen'
      | 'complete'
      | null;
    opportunity: Opportunity | null;
  }>({
    open: false,
    type: null,
    opportunity: null,
  });

  // Load opportunities and stats
  const loadData = async () => {
    try {
      setLoading(true);

      // Load opportunities
      const opportunitiesResponse = await fetch('/api/admin/opportunities');
      if (opportunitiesResponse.ok) {
        const opportunitiesData = await opportunitiesResponse.json();
        setOpportunities(opportunitiesData.opportunities || []);
      }

      // Load stats
      const statsResponse = await fetch('/api/admin/opportunities/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados das oportunidades',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle opportunity actions
  const handleAction = async (action: string, opportunityId: string) => {
    try {
      let response;

      if (action === 'delete') {
        // Use DELETE method for delete action
        response = await fetch(`/api/admin/opportunities/${opportunityId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } else {
        // Use PATCH method for status change actions
        response = await fetch(`/api/admin/opportunities/${opportunityId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action }),
        });
      }

      if (response.ok) {
        const result = await response.json();
        const actionMessages: { [key: string]: string } = {
          approve: 'aprovada',
          reject: 'rejeitada',
          close: 'fechada',
          reopen: 'reaberta',
          complete: 'concluída',
          delete: 'excluída',
        };

        toast({
          title: 'Sucesso',
          description: `Oportunidade ${actionMessages[action] || 'atualizada'} com sucesso`,
        });
        loadData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na ação');
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao executar ação',
        variant: 'destructive',
      });
    }

    setActionDialog({ open: false, type: null, opportunity: null });
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch =
      opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opportunity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' || opportunity.status === statusFilter;
    const matchesCategory =
      categoryFilter === 'all' || opportunity.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get status badge variant
  const getStatusBadge = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants = {
      DRAFT: 'secondary' as const,
      draft: 'secondary' as const,
      ACTIVE: 'default' as const,
      active: 'default' as const,
      FUNDING: 'default' as const,
      funding: 'default' as const,
      FUNDED: 'default' as const,
      funded: 'default' as const,
      CLOSED: 'outline' as const,
      closed: 'outline' as const,
      COMPLETED: 'default' as const,
      completed: 'default' as const,
      CANCELLED: 'destructive' as const,
      cancelled: 'destructive' as const,
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  // Translate status to Portuguese
  const translateStatus = (status: string): string => {
    const translations = {
      DRAFT: 'Rascunho',
      draft: 'Rascunho',
      ACTIVE: 'Ativa',
      active: 'Ativa',
      FUNDING: 'Captando',
      funding: 'Captando',
      FUNDED: 'Financiada',
      funded: 'Financiada',
      CLOSED: 'Fechada',
      closed: 'Fechada',
      COMPLETED: 'Concluída',
      completed: 'Concluída',
      CANCELLED: 'Cancelada',
      cancelled: 'Cancelada',
    };
    return translations[status as keyof typeof translations] || status;
  };

  // Get risk level badge
  const getRiskBadge = (
    risk: string
  ): 'default' | 'secondary' | 'destructive' => {
    const variants = {
      low: 'default' as const,
      medium: 'secondary' as const,
      high: 'destructive' as const,
      baixo: 'default' as const,
      médio: 'secondary' as const,
      alto: 'destructive' as const,
    };
    return variants[risk as keyof typeof variants] || 'secondary';
  };

  // Translate risk level to Portuguese
  const translateRiskLevel = (risk: string): string => {
    const translations = {
      low: 'Baixo',
      medium: 'Médio',
      high: 'Alto',
      baixo: 'Baixo',
      médio: 'Médio',
      alto: 'Alto',
    };
    return translations[risk as keyof typeof translations] || risk;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number | undefined | null) => {
    if (value === undefined || value === null || isNaN(value)) {
      return '0.0%';
    }
    return `${value.toFixed(1)}%`;
  };

  // Calculate progress
  const calculateProgress = (
    current: number | undefined | null,
    target: number | undefined | null
  ) => {
    if (!current || !target || current === 0 || target === 0) {
      return 0;
    }
    return Math.min((current / target) * 100, 100);
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando oportunidades...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestão de Oportunidades
          </h1>
          <p className="text-gray-600">
            Gerencie oportunidades de investimento
          </p>
        </div>

        <Link href="/admin/opportunities/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nova Oportunidade
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.overview.totalOpportunities}
              </div>
              <p className="text-xs text-muted-foreground">oportunidades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.byStatus.ACTIVE.count}
              </div>
              <p className="text-xs text-muted-foreground">em captação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Financiadas</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.byStatus.COMPLETED.count}
              </div>
              <p className="text-xs text-muted-foreground">completas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Captado
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.overview.totalCapturedAmount)}
              </div>
              <p className="text-xs text-muted-foreground">em investimentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Ticket Médio
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.overview.averageInvestmentSize)}
              </div>
              <p className="text-xs text-muted-foreground">por investimento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(stats.performance.successRate)}
              </div>
              <p className="text-xs text-muted-foreground">taxa de conversão</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Buscar oportunidades..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="funding">Captando</SelectItem>
                <SelectItem value="funded">Financiada</SelectItem>
                <SelectItem value="closed">Fechada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                <SelectItem value="real_estate">Imóveis</SelectItem>
                <SelectItem value="technology">Tecnologia</SelectItem>
                <SelectItem value="retail">Varejo</SelectItem>
                <SelectItem value="services">Serviços</SelectItem>
                <SelectItem value="agriculture">Agronegócio</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Oportunidades ({filteredOpportunities.length})</CardTitle>
          <CardDescription>
            Lista de todas as oportunidades de investimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Oportunidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Risco</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Captado</TableHead>
                  <TableHead>Progresso</TableHead>
                  <TableHead>Investidores</TableHead>
                  <TableHead>Retorno</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOpportunities.map(opportunity => (
                  <TableRow key={opportunity.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{opportunity.title}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {opportunity.description}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge variant={getStatusBadge(opportunity.status)}>
                        {translateStatus(opportunity.status)}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <span className="capitalize">
                        {opportunity.category?.replace('_', ' ') ||
                          'Não categorizada'}
                      </span>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={getRiskBadge(
                          opportunity.riskLevel || 'medium'
                        )}
                      >
                        {translateRiskLevel(opportunity.riskLevel || 'medium')}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      {formatCurrency(opportunity.targetAmount)}
                    </TableCell>

                    <TableCell>
                      {formatCurrency(opportunity.currentAmount)}
                    </TableCell>

                    <TableCell>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${calculateProgress(opportunity.currentAmount, opportunity.targetAmount)}%`,
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatPercentage(
                          calculateProgress(
                            opportunity.currentAmount,
                            opportunity.targetAmount
                          )
                        )}
                      </span>
                    </TableCell>

                    <TableCell>{opportunity.investorCount || 0}</TableCell>

                    <TableCell>
                      {formatPercentage(opportunity.expectedReturn || 0)}
                    </TableCell>

                    <TableCell>
                      {opportunity.endDate
                        ? new Date(opportunity.endDate).toLocaleDateString(
                            'pt-BR'
                          )
                        : 'N/A'}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/opportunities/${opportunity.id}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Visualizar detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>

                        <Link
                          href={`/admin/opportunities/${opportunity.id}/edit`}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Editar oportunidade"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>

                        {/* Approve button - only for draft opportunities */}
                        {opportunity.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Aprovar oportunidade"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: 'approve',
                                opportunity,
                              })
                            }
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}

                        {/* Reject button - only for draft opportunities */}
                        {opportunity.status === 'DRAFT' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Rejeitar oportunidade"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: 'reject',
                                opportunity,
                              })
                            }
                          >
                            <XCircle className="h-4 w-4 text-red-600" />
                          </Button>
                        )}

                        {/* Close button - only for active opportunities */}
                        {opportunity.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Fechar captação"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: 'close',
                                opportunity,
                              })
                            }
                          >
                            <XCircle className="h-4 w-4 text-orange-600" />
                          </Button>
                        )}

                        {/* Reopen button - only for closed opportunities */}
                        {opportunity.status === 'CLOSED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Reabrir captação"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: 'reopen',
                                opportunity,
                              })
                            }
                          >
                            <CheckCircle className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}

                        {/* Complete button - only for active opportunities */}
                        {opportunity.status === 'ACTIVE' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Marcar como concluída"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: 'complete',
                                opportunity,
                              })
                            }
                          >
                            <CheckCircle className="h-4 w-4 text-purple-600" />
                          </Button>
                        )}

                        {/* Delete button - only for draft, cancelled or closed opportunities */}
                        {['DRAFT', 'CANCELLED', 'CLOSED'].includes(
                          opportunity.status
                        ) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Excluir oportunidade"
                            onClick={() =>
                              setActionDialog({
                                open: true,
                                type: 'delete',
                                opportunity,
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredOpportunities.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma oportunidade encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={open => setActionDialog({ ...actionDialog, open })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Aprovar Oportunidade'}
              {actionDialog.type === 'reject' && 'Rejeitar Oportunidade'}
              {actionDialog.type === 'close' && 'Fechar Oportunidade'}
              {actionDialog.type === 'reopen' && 'Reabrir Oportunidade'}
              {actionDialog.type === 'complete' && 'Concluir Oportunidade'}
              {actionDialog.type === 'delete' && 'Excluir Oportunidade'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' &&
                'Tem certeza que deseja aprovar esta oportunidade? Ela ficará disponível para investimento.'}
              {actionDialog.type === 'reject' &&
                'Tem certeza que deseja rejeitar esta oportunidade? Ela será marcada como rejeitada.'}
              {actionDialog.type === 'close' &&
                'Tem certeza que deseja fechar esta oportunidade? Ela não receberá mais investimentos.'}
              {actionDialog.type === 'reopen' &&
                'Tem certeza que deseja reabrir esta oportunidade? Ela voltará a receber investimentos.'}
              {actionDialog.type === 'complete' &&
                'Tem certeza que deseja marcar esta oportunidade como concluída? Ela será marcada como finalizada.'}
              {actionDialog.type === 'delete' &&
                'Tem certeza que deseja excluir esta oportunidade? Esta ação não pode ser desfeita.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, type: null, opportunity: null })
              }
            >
              Cancelar
            </Button>
            <Button
              variant={
                actionDialog.type === 'delete' ? 'destructive' : 'default'
              }
              onClick={() =>
                actionDialog.opportunity &&
                handleAction(actionDialog.type!, actionDialog.opportunity.id)
              }
            >
              {actionDialog.type === 'approve' && 'Aprovar'}
              {actionDialog.type === 'reject' && 'Rejeitar'}
              {actionDialog.type === 'close' && 'Fechar'}
              {actionDialog.type === 'reopen' && 'Reabrir'}
              {actionDialog.type === 'complete' && 'Concluir'}
              {actionDialog.type === 'delete' && 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
