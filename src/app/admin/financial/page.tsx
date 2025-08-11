'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, Users, CreditCard, AlertCircle, Download, Filter, Calendar } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalInvestments: number;
  monthlyInvestments: number;
  totalCommissions: number;
  monthlyCommissions: number;
  activeInvestors: number;
  pendingTransactions: number;
  revenueGrowth: number;
  investmentGrowth: number;
}

interface Transaction {
  id: string;
  type: 'investment' | 'commission' | 'withdrawal' | 'refund';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  description: string;
  userId: string;
  userName: string;
  userEmail: string;
  opportunityId?: string;
  opportunityTitle?: string;
  createdAt: string;
  updatedAt: string;
}

interface RevenueData {
  month: string;
  revenue: number;
  investments: number;
  commissions: number;
}

export default function FinancialPage() {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Load financial data
  const loadFinancialData = async () => {
    try {
      setLoading(true);
      
      // Load metrics
      const metricsResponse = await fetch(`/api/admin/financial/dashboard?period=${selectedPeriod}`);
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics);
        setRevenueData(metricsData.revenueData || []);
      }

      // Load transactions
      const transactionsResponse = await fetch(`/api/admin/financial/transactions?limit=50&type=${transactionFilter}&status=${statusFilter}`);
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setTransactions(transactionsData.transactions || []);
      }

    } catch (error) {
      console.error('Error loading financial data:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados financeiros',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Export financial report
  const exportReport = async () => {
    try {
      const response = await fetch(`/api/admin/financial/reports/export?period=${selectedPeriod}&format=xlsx`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: 'Sucesso',
          description: 'Relatório exportado com sucesso',
        });
      } else {
        throw new Error('Erro ao exportar relatório');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao exportar relatório',
        variant: 'destructive',
      });
    }
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
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get transaction type badge
  const getTransactionTypeBadge = (type: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants = {
      investment: 'default' as const,
      commission: 'secondary' as const,
      withdrawal: 'outline' as const,
      refund: 'destructive' as const,
    };
    return variants[type as keyof typeof variants] || 'secondary';
  };

  // Get status badge
  const getStatusBadge = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants = {
      pending: 'secondary' as const,
      completed: 'default' as const,
      failed: 'destructive' as const,
      cancelled: 'outline' as const,
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  // Get status color for metrics
  const getGrowthColor = (growth: number) => {
    if (growth > 0) return 'text-green-600';
    if (growth < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  useEffect(() => {
    loadFinancialData();
  }, [selectedPeriod, transactionFilter, statusFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Controle Financeiro</h1>
          <p className="text-gray-600">Dashboard financeiro e controle de transações</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 dias</SelectItem>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
              <SelectItem value="365">1 ano</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
              <p className="text-xs text-muted-foreground">
                <span className={getGrowthColor(metrics.revenueGrowth)}>
                  {formatPercentage(metrics.revenueGrowth)}
                </span>
                {' '}vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Investimentos</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalInvestments)}</div>
              <p className="text-xs text-muted-foreground">
                <span className={getGrowthColor(metrics.investmentGrowth)}>
                  {formatPercentage(metrics.investmentGrowth)}
                </span>
                {' '}vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissões</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(metrics.totalCommissions)}</div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metrics.monthlyCommissions)} este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Investidores Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.activeInvestors}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.pendingTransactions} transações pendentes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="reconciliation">Conciliação</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Revenue Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução da Receita</CardTitle>
              <CardDescription>
                Receita, investimentos e comissões ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">Gráfico de receita será implementado aqui</p>
                  <p className="text-sm text-gray-400">Integração com biblioteca de gráficos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Receita Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {metrics ? formatCurrency(metrics.monthlyRevenue) : formatCurrency(0)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Meta: {formatCurrency(500000)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${metrics ? Math.min((metrics.monthlyRevenue / 500000) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Investimentos Mensais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {metrics ? formatCurrency(metrics.monthlyInvestments) : formatCurrency(0)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Meta: {formatCurrency(2000000)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${metrics ? Math.min((metrics.monthlyInvestments / 2000000) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Comissões Mensais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {metrics ? formatCurrency(metrics.monthlyCommissions) : formatCurrency(0)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Meta: {formatCurrency(100000)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${metrics ? Math.min((metrics.monthlyCommissions / 100000) * 100, 100) : 0}%`
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4">
                <Select value={transactionFilter} onValueChange={setTransactionFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Tipos</SelectItem>
                    <SelectItem value="investment">Investimentos</SelectItem>
                    <SelectItem value="commission">Comissões</SelectItem>
                    <SelectItem value="withdrawal">Saques</SelectItem>
                    <SelectItem value="refund">Reembolsos</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Transactions Table */}
          <Card>
            <CardHeader>
              <CardTitle>Transações Recentes</CardTitle>
              <CardDescription>
                Lista das transações mais recentes ({transactions.length})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {transaction.id.slice(0, 8)}...
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant={getTransactionTypeBadge(transaction.type)}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.userName}</div>
                            <div className="text-sm text-gray-500">{transaction.userEmail}</div>
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          <div>
                            <div className="font-medium">{transaction.description}</div>
                            {transaction.opportunityTitle && (
                              <div className="text-sm text-gray-500">{transaction.opportunityTitle}</div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell className="font-medium">
                          {formatCurrency(transaction.amount)}
                        </TableCell>
                        
                        <TableCell>
                          <Badge variant={getStatusBadge(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        
                        <TableCell>
                          {new Date(transaction.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {transactions.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma transação encontrada</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relatórios Financeiros</CardTitle>
              <CardDescription>
                Gere relatórios detalhados sobre a performance financeira
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Relatório de Receita</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Análise detalhada da receita por período, categoria e fonte
                  </p>
                  <Button onClick={exportReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Relatório de Investimentos</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Análise dos investimentos por oportunidade e investidor
                  </p>
                  <Button onClick={exportReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Relatório de Comissões</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Detalhamento das comissões geradas e pagas
                  </p>
                  <Button onClick={exportReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </div>

                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Relatório Fiscal</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Dados para declaração fiscal e compliance
                  </p>
                  <Button onClick={exportReport}>
                    <Download className="h-4 w-4 mr-2" />
                    Gerar Relatório
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Conciliação Bancária</CardTitle>
              <CardDescription>
                Concilie transações com extratos bancários
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Funcionalidade em Desenvolvimento</h3>
                <p className="text-gray-600 mb-4">
                  A conciliação bancária automática será implementada em breve
                </p>
                <Button variant="outline">
                  Solicitar Implementação
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
