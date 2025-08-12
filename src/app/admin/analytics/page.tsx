'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TooltipProvider,
  MetricTooltip,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Target,
  FileDown,
  Calendar,
  BarChart3,
  Download,
  Info,
  CreditCard,
  Percent,
} from 'lucide-react';

// Tipos de dados
interface AnalyticsMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  averageTransactionValue: number;
  revenueGrowth: number;
  totalUsers: number;
  activeUsers: number;
  activeSubscribers: number;
  newUsersThisMonth: number;
  userGrowthRate: number;
  totalInvestments: number;
  averageInvestmentValue: number;
  investmentGrowth: number;
  topInvestmentCategories: {
    category: string;
    value: number;
    percentage: number;
  }[];
  conversionRate: number;
  retentionRate: number;
  churnRate: number;
  ltv: number;
}

interface TimeSeriesData {
  period: string;
  revenue: number;
  users: number;
  investments: number;
  transactions: number;
}

interface RegionalData {
  region: string;
  users: number;
  revenue: number;
  growth: number;
}

interface CategoryPerformance {
  category: string;
  value: number;
  count: number;
  averageValue: number;
  growth: number;
}

export default function AnalyticsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [exportingReport, setExportingReport] = useState(false);

  // Estados dos dados
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [regionalData, setRegionalData] = useState<RegionalData[]>([]);
  const [categoryPerformance, setCategoryPerformance] = useState<
    CategoryPerformance[]
  >([]);

  // Função para buscar dados de analytics
  const fetchAnalyticsData = async () => {
    setLoading(true);
    try {
      const timestamp = Date.now(); // Cache buster
      console.log(
        '🔄 Iniciando fetch de analytics...',
        new Date().toLocaleTimeString()
      );

      const [metricsRes, timeSeriesRes, regionalRes, categoryRes] =
        await Promise.all([
          fetch(
            `/api/admin/analytics/metrics?period=${selectedPeriod}&t=${timestamp}`
          ),
          fetch(
            `/api/admin/analytics/timeseries?period=${selectedPeriod}&t=${timestamp}`
          ),
          fetch(
            `/api/admin/analytics/regional?period=${selectedPeriod}&t=${timestamp}`
          ),
          fetch(
            `/api/admin/analytics/categories?period=${selectedPeriod}&t=${timestamp}`
          ),
        ]);

      console.log('📊 Status das respostas:', {
        metrics: metricsRes.status,
        timeseries: timeSeriesRes.status,
        regional: regionalRes.status,
        categories: categoryRes.status,
      });

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        console.log('Metrics data:', metricsData);
        setMetrics(metricsData);
      } else {
        console.error('Metrics API error:', await metricsRes.text());
        setMetrics(null);
      }

      if (timeSeriesRes.ok) {
        const timeData = await timeSeriesRes.json();
        console.log('Time series data:', timeData);
        setTimeSeriesData(timeData);
      } else {
        console.error('Time series API error:', await timeSeriesRes.text());
        setTimeSeriesData([]);
      }

      if (regionalRes.ok) {
        const regData = await regionalRes.json();
        console.log('Regional data:', regData);
        setRegionalData(regData);
      } else {
        console.error('Regional API error:', await regionalRes.text());
        setRegionalData([]);
      }

      if (categoryRes.ok) {
        const catData = await categoryRes.json();
        console.log('Category data:', catData);
        setCategoryPerformance(catData);
      } else {
        console.error('Category API error:', await categoryRes.text());
        setCategoryPerformance([]);
      }
    } catch (error) {
      console.error('Analytics fetch error:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar dados de analytics',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Função para exportar relatório
  const exportReport = async (type: 'pdf' | 'excel' | 'csv') => {
    setExportingReport(true);
    try {
      const response = await fetch('/api/admin/analytics/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          period: selectedPeriod,
          data: {
            metrics,
            timeSeriesData,
            regionalData,
            categoryPerformance,
          },
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.${type}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
          title: 'Sucesso',
          description: `Relatório ${type.toUpperCase()} baixado com sucesso`,
        });
      } else {
        throw new Error('Falha na exportação');
      }
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao exportar relatório',
        variant: 'destructive',
      });
    } finally {
      setExportingReport(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  // Cores para gráficos
  const chartColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00'];

  // Formatação de valores
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Analytics e Relatórios</h1>
            <p className="text-muted-foreground">
              Painel analítico completo com métricas de performance
            </p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[180px]">
                <Calendar className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último ano</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => fetchAnalyticsData()} variant="outline">
              <BarChart3 className="mr-2 h-4 w-4" />
              Atualizar
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
          </TabsList>

          {/* Visão Geral */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      Receita Total
                    </CardTitle>
                    <MetricTooltip
                      title="💰 Receita Total"
                      description="Soma de todas as transações completas incluindo investimentos, pagamentos de assinatura, bônus de indicação e retornos de investimento."
                      formula="Σ(Investimentos + Assinaturas + Bônus + Retornos)"
                      example="R$ 6.490 em transações nos últimos 30 dias"
                    >
                      <Info className="h-3 w-3 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                    </MetricTooltip>
                  </div>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics ? formatCurrency(metrics.totalRevenue) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics && (
                      <span
                        className={`flex items-center ${metrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {metrics.revenueGrowth >= 0 ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {formatPercentage(Math.abs(metrics.revenueGrowth))} vs
                        período anterior
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      Usuários Ativos
                    </CardTitle>
                    <MetricTooltip
                      title="👥 Usuários Ativos"
                      description="Usuários que mantêm status ativo na plataforma. Esta métrica representa a base de usuários engajados e disponíveis para novas transações."
                      formula="Count(usuários WHERE isActive = true)"
                      example="7 usuários ativos de 7 totais = 100% de atividade"
                    >
                      <Info className="h-3 w-3 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                    </MetricTooltip>
                  </div>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics ? formatNumber(metrics.activeUsers) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics && (
                      <span
                        className={`flex items-center ${metrics.userGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {metrics.userGrowthRate >= 0 ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {formatPercentage(Math.abs(metrics.userGrowthRate))}{' '}
                        crescimento
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      Assinantes Ativos
                    </CardTitle>
                    <MetricTooltip
                      title="💳 Assinantes Ativos"
                      description="Usuários normais (não administradores) com plano de mensalidade ativo na plataforma. Exclui usuários com roles administrativos (ADMIN, SUPER_ADMIN, SUPPORT, FINANCIAL)."
                      formula="Count(usuários WHERE role = 'USER' AND isActive = true AND membership.status = 'ACTIVE')"
                      example="2 usuários normais pagantes de 4 usuários totais (excluindo 3 admins)"
                      link="/admin/memberships"
                    >
                      <Info className="h-3 w-3 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                    </MetricTooltip>
                  </div>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics ? formatNumber(metrics.activeSubscribers) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics && (
                      <span className="flex items-center text-blue-600">
                        <Percent className="mr-1 h-3 w-3" />
                        {formatPercentage(
                          (metrics.activeSubscribers / metrics.totalUsers) * 100
                        )}{' '}
                        dos usuários
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      Total Investimentos
                    </CardTitle>
                    <MetricTooltip
                      title="🎯 Total de Investimentos"
                      description="Soma de todos os investimentos realizados pelos usuários na plataforma. Representa o capital total depositado em oportunidades de investimento."
                      formula="Σ(user_investments.amount WHERE status = 'active')"
                      example="R$ 20.000 em investimentos ativos distribuídos entre usuários"
                    >
                      <Info className="h-3 w-3 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                    </MetricTooltip>
                  </div>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics ? formatCurrency(metrics.totalInvestments) : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics && (
                      <span
                        className={`flex items-center ${metrics.investmentGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}
                      >
                        {metrics.investmentGrowth >= 0 ? (
                          <TrendingUp className="mr-1 h-3 w-3" />
                        ) : (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        )}
                        {formatPercentage(Math.abs(metrics.investmentGrowth))}{' '}
                        crescimento
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">
                      Ticket Médio
                    </CardTitle>
                    <MetricTooltip
                      title="🎫 Ticket Médio"
                      description="Valor médio por transação, calculado dividindo a receita total pelo número de transações. Indica o valor típico que cada transação gera."
                      formula="Receita total ÷ Número de transações"
                      example="R$ 6.490 ÷ 5 transações = R$ 1.298 por transação"
                    >
                      <Info className="h-3 w-3 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                    </MetricTooltip>
                  </div>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics
                      ? formatCurrency(metrics.averageTransactionValue)
                      : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Valor médio por transação
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Gráfico de tendência */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Tendência de Performance</CardTitle>
                  <MetricTooltip
                    title="📈 Tendência de Performance"
                    description="Visualização temporal das principais métricas do sistema. Permite identificar padrões, sazonalidades e tendências de crescimento ou declínio."
                    formula="Dados agregados por período selecionado"
                    example="Evolução da receita e usuários nos últimos 30 dias"
                  >
                    <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                  </MetricTooltip>
                </div>
                <CardDescription>
                  Evolução das principais métricas ao longo do tempo
                </CardDescription>
              </CardHeader>
              <CardContent>
                {timeSeriesData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={timeSeriesData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === 'revenue' || name === 'investments'
                            ? formatCurrency(value)
                            : formatNumber(value),
                          name === 'revenue'
                            ? 'Receita'
                            : name === 'users'
                              ? 'Usuários'
                              : name === 'investments'
                                ? 'Investimentos'
                                : 'Transações',
                        ]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stackId="1"
                        stroke="#8884d8"
                        fill="#8884d8"
                        name="Receita"
                      />
                      <Area
                        type="monotone"
                        dataKey="users"
                        stackId="2"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        name="Usuários"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px]">
                    <p className="text-muted-foreground">
                      Nenhum dado disponível
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financeiro */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Receita por Período</CardTitle>
                  <CardDescription>
                    Evolução da receita nos últimos {selectedPeriod} dias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {timeSeriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [
                            formatCurrency(value),
                            'Receita',
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="#8884d8"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <p className="text-muted-foreground">
                        Nenhum dado disponível
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Categorias de Investimento</CardTitle>
                  <CardDescription>
                    Distribuição por categoria de investimento
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {metrics && metrics.topInvestmentCategories.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={metrics.topInvestmentCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percentage }) =>
                            `${name} (${percentage}%)`
                          }
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {metrics.topInvestmentCategories.map(
                            (entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={chartColors[index % chartColors.length]}
                              />
                            )
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [
                            formatCurrency(value),
                            'Valor',
                          ]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <p className="text-muted-foreground">
                        Nenhum dado disponível
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance de Categorias */}
            <Card>
              <CardHeader>
                <CardTitle>Performance por Categoria</CardTitle>
                <CardDescription>
                  Análise detalhada de cada categoria de transação
                </CardDescription>
              </CardHeader>
              <CardContent>
                {categoryPerformance.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Valor Total</TableHead>
                        <TableHead>Quantidade</TableHead>
                        <TableHead>Valor Médio</TableHead>
                        <TableHead>Crescimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryPerformance.map((category, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {category.category}
                          </TableCell>
                          <TableCell>
                            {formatCurrency(category.value)}
                          </TableCell>
                          <TableCell>{formatNumber(category.count)}</TableCell>
                          <TableCell>
                            {formatCurrency(category.averageValue)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                category.growth >= 0 ? 'default' : 'destructive'
                              }
                              className="flex items-center gap-1"
                            >
                              {category.growth >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {formatPercentage(Math.abs(category.growth))}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center h-[200px]">
                    <p className="text-muted-foreground">
                      Nenhum dado disponível
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usuários */}
          <TabsContent value="users" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Crescimento de Usuários</CardTitle>
                  <CardDescription>
                    Evolução da base de usuários ativos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {timeSeriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [
                            formatNumber(value),
                            'Usuários',
                          ]}
                        />
                        <Bar dataKey="users" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <p className="text-muted-foreground">
                        Nenhum dado disponível
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Usuários</CardTitle>
                  <CardDescription>
                    Principais indicadores de engajamento
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metrics ? (
                    <>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Taxa de Conversão
                          </span>
                          <MetricTooltip
                            title="Taxa de Conversão"
                            description="Percentual de usuários que se tornaram investidores ativos na plataforma. Esta métrica indica a efetividade em converter visitantes em clientes pagantes."
                            formula="(Usuários com investimentos ÷ Total de usuários) × 100"
                            example="Se 2 de 7 usuários investiram: (2 ÷ 7) × 100 = 28.6%"
                            link="#"
                          >
                            <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                          </MetricTooltip>
                        </div>
                        <Badge variant="outline">
                          {formatPercentage(metrics.conversionRate)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Taxa de Retenção
                          </span>
                          <MetricTooltip
                            title="Taxa de Retenção"
                            description="Percentual de usuários que mantiveram engajamento através de transações. Indica a capacidade de manter usuários ativos ao longo do tempo."
                            formula="(Usuários com transações ÷ Total de usuários) × 100"
                            example="Usuários que fizeram pelo menos uma transação completa"
                            link="#"
                          >
                            <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                          </MetricTooltip>
                        </div>
                        <Badge variant="default">
                          {formatPercentage(metrics.retentionRate)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            Taxa de Churn
                          </span>
                          <MetricTooltip
                            title="Taxa de Churn"
                            description="Percentual de usuários que se tornaram inativos. Uma métrica crítica que indica perda de usuários - quanto menor, melhor."
                            formula="((Total de usuários - Usuários ativos) ÷ Total) × 100"
                            example="Se todos os 7 usuários estão ativos: churn = 0%"
                            link="#"
                          >
                            <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                          </MetricTooltip>
                        </div>
                        <Badge variant="destructive">
                          {formatPercentage(metrics.churnRate)}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            LTV (Lifetime Value)
                          </span>
                          <MetricTooltip
                            title="LTV - Lifetime Value"
                            description="Valor médio que cada usuário ativo gera durante sua permanência na plataforma. Métrica fundamental para estratégias de aquisição e retenção."
                            formula="Receita total dos usuários ÷ Usuários com transações"
                            example="R$ 6.490 total ÷ 2 usuários ativos = R$ 3.245 por usuário"
                            link="#"
                          >
                            <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                          </MetricTooltip>
                        </div>
                        <Badge variant="outline">
                          {formatCurrency(metrics.ltv)}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[200px]">
                      <p className="text-muted-foreground">
                        Nenhum dado disponível
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Performance Regional */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>Performance Regional</CardTitle>
                  <MetricTooltip
                    title="🌎 Performance Regional"
                    description="Análise da distribuição geográfica dos usuários e receita por estado brasileiro. Os dados são calculados com base na localização informada pelos usuários durante o cadastro."
                    formula="Usuários agrupados por estado + Receita das transações por região"
                    example="SP: 1 usuário, R$ 6.420 | RJ: 1 usuário, R$ 70 | MG: 1 usuário, R$ 0"
                  >
                    <Info className="h-4 w-4 text-muted-foreground cursor-help hover:text-primary transition-colors" />
                  </MetricTooltip>
                </div>
                <CardDescription>
                  Distribuição de usuários e receita por região
                </CardDescription>
              </CardHeader>
              <CardContent>
                {regionalData.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Região</TableHead>
                        <TableHead>Usuários</TableHead>
                        <TableHead>Receita</TableHead>
                        <TableHead>Crescimento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regionalData.map((region, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {region.region}
                          </TableCell>
                          <TableCell>{formatNumber(region.users)}</TableCell>
                          <TableCell>
                            {formatCurrency(region.revenue)}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                region.growth >= 0 ? 'default' : 'destructive'
                              }
                              className="flex items-center gap-1"
                            >
                              {region.growth >= 0 ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : (
                                <TrendingDown className="h-3 w-3" />
                              )}
                              {formatPercentage(Math.abs(region.growth))}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex items-center justify-center h-[200px]">
                    <p className="text-muted-foreground">
                      Nenhum dado disponível
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Volume de Transações</CardTitle>
                  <CardDescription>
                    Número de transações processadas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {timeSeriesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip
                          formatter={(value: number) => [
                            formatNumber(value),
                            'Transações',
                          ]}
                        />
                        <Bar dataKey="transactions" fill="#ffc658" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-[300px]">
                      <p className="text-muted-foreground">
                        Nenhum dado disponível
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Métricas de Performance</CardTitle>
                  <CardDescription>
                    Indicadores chave de performance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {metrics ? (
                    <>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Receita Mensal
                        </span>
                        <span className="font-bold">
                          {formatCurrency(metrics.monthlyRevenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Novos Usuários (Mês)
                        </span>
                        <span className="font-bold">
                          {formatNumber(metrics.newUsersThisMonth)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Valor Médio Investimento
                        </span>
                        <span className="font-bold">
                          {formatCurrency(metrics.averageInvestmentValue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">
                          Total de Usuários
                        </span>
                        <span className="font-bold">
                          {formatNumber(metrics.totalUsers)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-[200px]">
                      <p className="text-muted-foreground">
                        Nenhum dado disponível
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Relatórios */}
          <TabsContent value="reports" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Exportar Relatórios</CardTitle>
                <CardDescription>
                  Gere relatórios detalhados em diferentes formatos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Button
                    onClick={() => exportReport('pdf')}
                    disabled={exportingReport}
                    className="h-20 flex-col"
                  >
                    <FileDown className="h-6 w-6 mb-2" />
                    Relatório PDF
                  </Button>
                  <Button
                    onClick={() => exportReport('excel')}
                    disabled={exportingReport}
                    variant="outline"
                    className="h-20 flex-col"
                  >
                    <Download className="h-6 w-6 mb-2" />
                    Planilha Excel
                  </Button>
                  <Button
                    onClick={() => exportReport('csv')}
                    disabled={exportingReport}
                    variant="outline"
                    className="h-20 flex-col"
                  >
                    <Download className="h-6 w-6 mb-2" />
                    Arquivo CSV
                  </Button>
                </div>

                {exportingReport && (
                  <div className="flex items-center justify-center py-4">
                    <LoadingSpinner />
                    <span className="ml-2">Gerando relatório...</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumo dos dados */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo dos Dados</CardTitle>
                <CardDescription>
                  Visão geral dos dados carregados
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {metrics ? '✓' : '✗'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Métricas
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {timeSeriesData.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pontos Temporais
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {regionalData.length}
                    </div>
                    <div className="text-sm text-muted-foreground">Regiões</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">
                      {categoryPerformance.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Categorias
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
}
