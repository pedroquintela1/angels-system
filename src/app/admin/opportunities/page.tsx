'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Filter, Eye, Edit, Trash2, CheckCircle, XCircle, DollarSign, Users, Calendar, TrendingUp } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  expectedReturn: number;
  deadline: string;
  status: 'draft' | 'active' | 'funding' | 'funded' | 'closed' | 'cancelled';
  category: string;
  riskLevel: 'low' | 'medium' | 'high';
  investorCount: number;
  createdAt: string;
  updatedAt: string;
}

interface OpportunityStats {
  total: number;
  active: number;
  funded: number;
  totalRaised: number;
  averageTicket: number;
  conversionRate: number;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [stats, setStats] = useState<OpportunityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'close' | 'delete' | null;
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
      const response = await fetch(`/api/admin/opportunities/${opportunityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: `Oportunidade ${action === 'approve' ? 'aprovada' : action === 'reject' ? 'rejeitada' : 'atualizada'} com sucesso`,
        });
        loadData();
      } else {
        throw new Error('Erro na ação');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao executar ação',
        variant: 'destructive',
      });
    }
    
    setActionDialog({ open: false, type: null, opportunity: null });
  };

  // Filter opportunities
  const filteredOpportunities = opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || opportunity.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || opportunity.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      active: 'default',
      funding: 'default',
      funded: 'default',
      closed: 'outline',
      cancelled: 'destructive',
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  // Get risk level badge
  const getRiskBadge = (risk: string) => {
    const variants = {
      low: 'default',
      medium: 'secondary',
      high: 'destructive',
    };
    return variants[risk as keyof typeof variants] || 'secondary';
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Calculate progress
  const calculateProgress = (current: number, target: number) => {
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
          <h1 className="text-3xl font-bold text-gray-900">Gestão de Oportunidades</h1>
          <p className="text-gray-600">Gerencie oportunidades de investimento</p>
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
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">oportunidades</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ativas</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">em captação</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Financiadas</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.funded}</div>
              <p className="text-xs text-muted-foreground">completas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Captado</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRaised)}</div>
              <p className="text-xs text-muted-foreground">em investimentos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.averageTicket)}</div>
              <p className="text-xs text-muted-foreground">por investimento</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPercentage(stats.conversionRate)}</div>
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
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                {filteredOpportunities.map((opportunity) => (
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
                        {opportunity.status}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <span className="capitalize">{opportunity.category.replace('_', ' ')}</span>
                    </TableCell>
                    
                    <TableCell>
                      <Badge variant={getRiskBadge(opportunity.riskLevel)}>
                        {opportunity.riskLevel}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>{formatCurrency(opportunity.targetAmount)}</TableCell>
                    
                    <TableCell>{formatCurrency(opportunity.currentAmount)}</TableCell>
                    
                    <TableCell>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{
                            width: `${calculateProgress(opportunity.currentAmount, opportunity.targetAmount)}%`
                          }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatPercentage(calculateProgress(opportunity.currentAmount, opportunity.targetAmount))}
                      </span>
                    </TableCell>
                    
                    <TableCell>{opportunity.investorCount}</TableCell>
                    
                    <TableCell>{formatPercentage(opportunity.expectedReturn)}</TableCell>
                    
                    <TableCell>
                      {new Date(opportunity.deadline).toLocaleDateString('pt-BR')}
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/opportunities/${opportunity.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        <Link href={`/admin/opportunities/${opportunity.id}/edit`}>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </Link>
                        
                        {opportunity.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActionDialog({
                              open: true,
                              type: 'approve',
                              opportunity
                            })}
                          >
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        
                        {opportunity.status === 'active' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActionDialog({
                              open: true,
                              type: 'close',
                              opportunity
                            })}
                          >
                            <XCircle className="h-4 w-4 text-orange-600" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActionDialog({
                            open: true,
                            type: 'delete',
                            opportunity
                          })}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
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
      <Dialog open={actionDialog.open} onOpenChange={(open) => setActionDialog({ ...actionDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === 'approve' && 'Aprovar Oportunidade'}
              {actionDialog.type === 'reject' && 'Rejeitar Oportunidade'}
              {actionDialog.type === 'close' && 'Fechar Oportunidade'}
              {actionDialog.type === 'delete' && 'Excluir Oportunidade'}
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === 'approve' && 'Tem certeza que deseja aprovar esta oportunidade? Ela ficará disponível para investimento.'}
              {actionDialog.type === 'reject' && 'Tem certeza que deseja rejeitar esta oportunidade?'}
              {actionDialog.type === 'close' && 'Tem certeza que deseja fechar esta oportunidade? Ela não receberá mais investimentos.'}
              {actionDialog.type === 'delete' && 'Tem certeza que deseja excluir esta oportunidade? Esta ação não pode ser desfeita.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialog({ open: false, type: null, opportunity: null })}
            >
              Cancelar
            </Button>
            <Button
              variant={actionDialog.type === 'delete' ? 'destructive' : 'default'}
              onClick={() => actionDialog.opportunity && handleAction(actionDialog.type!, actionDialog.opportunity.id)}
            >
              {actionDialog.type === 'approve' && 'Aprovar'}
              {actionDialog.type === 'reject' && 'Rejeitar'}
              {actionDialog.type === 'close' && 'Fechar'}
              {actionDialog.type === 'delete' && 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
