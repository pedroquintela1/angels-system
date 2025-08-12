'use client';

import { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  AlertCircle,
  Download,
  Filter,
  Calendar,
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

interface FinancialMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  totalInvestments: number;
  monthlyInvestments: number;
  totalCommissions: number;
  monthlyCommissions: number;
  totalMonthlyFees: number;
  currentMonthFees: number;
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
  monthlyFees: number;
}

interface BankStatement {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance: number;
  reference?: string;
}

interface ReconciliationItem {
  id: string;
  bankTransaction: BankStatement | null;
  systemTransaction: Transaction | null;
  status: 'matched' | 'unmatched_bank' | 'unmatched_system' | 'discrepancy';
  difference?: number;
  matchedAt?: string;
  notes?: string;
  discrepancyDetails?: {
    reason: string;
    expectedValue?: number;
    actualValue?: number;
    expectedDate?: string;
    actualDate?: string;
    field: 'amount' | 'date' | 'description' | 'multiple';
  };
}

interface ReconciliationSummary {
  totalBankTransactions: number;
  totalSystemTransactions: number;
  matchedCount: number;
  unmatchedBankCount: number;
  unmatchedSystemCount: number;
  discrepancyCount: number;
  totalDifference: number;
}

export default function FinancialPage() {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [transactionFilter, setTransactionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Reconciliation states
  const [bankStatements, setBankStatements] = useState<BankStatement[]>([]);
  const [reconciliationItems, setReconciliationItems] = useState<
    ReconciliationItem[]
  >([]);
  const [reconciliationSummary, setReconciliationSummary] =
    useState<ReconciliationSummary | null>(null);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [uploadingStatement, setUploadingStatement] = useState(false);

  // Load financial data
  const loadFinancialData = async () => {
    try {
      setLoading(true);

      // Load metrics
      const metricsResponse = await fetch(
        `/api/admin/financial/dashboard?period=${selectedPeriod}`
      );
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics);
        setRevenueData(metricsData.revenueData || []);
      }

      // Load transactions
      const transactionsResponse = await fetch(
        `/api/admin/financial/transactions?limit=50&type=${transactionFilter}&status=${statusFilter}`
      );
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
      const response = await fetch(
        `/api/admin/financial/reports/export?period=${selectedPeriod}&format=xlsx`
      );

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

  // Upload bank statement
  const handleStatementUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingStatement(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        '/api/admin/financial/reconciliation/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBankStatements(data.statements);
        toast({
          title: 'Sucesso',
          description: `Extrato carregado: ${data.statements.length} transações processadas`,
        });
        // Auto-start reconciliation after upload
        performReconciliation(data.statements);
      } else {
        throw new Error('Erro ao processar extrato');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar extrato bancário',
        variant: 'destructive',
      });
    } finally {
      setUploadingStatement(false);
    }
  };

  // Perform automatic reconciliation
  const performReconciliation = async (statements?: BankStatement[]) => {
    setReconciliationLoading(true);
    try {
      const statementsToUse = statements || bankStatements;
      const systemTransactions = transactions;

      const items: ReconciliationItem[] = [];
      const matchedSystemTransactions = new Set<string>();
      const matchedBankTransactions = new Set<string>();

      // Try to match bank statements with system transactions
      statementsToUse.forEach(bankTx => {
        const potentialMatches = systemTransactions.filter(sysTx => {
          // Match by amount and date (within 2 days)
          const amountMatch =
            Math.abs(Math.abs(bankTx.amount) - sysTx.amount) < 0.01;
          const bankDate = new Date(bankTx.date);
          const sysDate = new Date(sysTx.createdAt);
          const dateDiff =
            Math.abs(bankDate.getTime() - sysDate.getTime()) /
            (1000 * 60 * 60 * 24);
          const dateMatch = dateDiff <= 2;

          return (
            amountMatch && dateMatch && !matchedSystemTransactions.has(sysTx.id)
          );
        });

        // Also check for partial matches (same amount but different date, or similar description)
        const partialMatches = systemTransactions.filter(sysTx => {
          if (matchedSystemTransactions.has(sysTx.id)) return false;

          const amountMatch =
            Math.abs(Math.abs(bankTx.amount) - sysTx.amount) < 0.01;
          const bankDate = new Date(bankTx.date);
          const sysDate = new Date(sysTx.createdAt);
          const dateDiff =
            Math.abs(bankDate.getTime() - sysDate.getTime()) /
            (1000 * 60 * 60 * 24);
          const dateMatch = dateDiff <= 2;

          // Check for description similarity (basic check)
          const descriptionSimilar =
            bankTx.description
              .toLowerCase()
              .includes(sysTx.description.toLowerCase()) ||
            sysTx.description
              .toLowerCase()
              .includes(bankTx.description.toLowerCase());

          return (
            (amountMatch && !dateMatch) ||
            (!amountMatch && dateMatch) ||
            descriptionSimilar
          );
        });

        if (potentialMatches.length === 1) {
          // Perfect match found
          const match = potentialMatches[0];
          items.push({
            id: `${bankTx.id}-${match.id}`,
            bankTransaction: bankTx,
            systemTransaction: match,
            status: 'matched',
            matchedAt: new Date().toISOString(),
          });
          matchedSystemTransactions.add(match.id);
          matchedBankTransactions.add(bankTx.id);
        } else if (potentialMatches.length > 1) {
          // Multiple matches - mark as discrepancy
          items.push({
            id: `${bankTx.id}-multiple`,
            bankTransaction: bankTx,
            systemTransaction: null,
            status: 'discrepancy',
            notes: `${potentialMatches.length} possíveis correspondências encontradas`,
            discrepancyDetails: {
              reason: `Múltiplas correspondências encontradas (${potentialMatches.length})`,
              field: 'multiple',
            },
          });
          matchedBankTransactions.add(bankTx.id);
        } else if (partialMatches.length > 0) {
          // Partial match found - mark as discrepancy with details
          const partialMatch = partialMatches[0];
          const amountMatch =
            Math.abs(Math.abs(bankTx.amount) - partialMatch.amount) < 0.01;
          const bankDate = new Date(bankTx.date);
          const sysDate = new Date(partialMatch.createdAt);
          const dateDiff =
            Math.abs(bankDate.getTime() - sysDate.getTime()) /
            (1000 * 60 * 60 * 24);
          const dateMatch = dateDiff <= 2;

          let reason = '';
          let field: 'amount' | 'date' | 'description' | 'multiple' =
            'multiple';

          if (!amountMatch && dateMatch) {
            reason = `Discrepância no valor: Banco R$ ${Math.abs(bankTx.amount).toFixed(2)} vs Sistema R$ ${partialMatch.amount.toFixed(2)}`;
            field = 'amount';
          } else if (amountMatch && !dateMatch) {
            reason = `Discrepância na data: diferença de ${Math.round(dateDiff)} dias`;
            field = 'date';
          } else {
            reason =
              'Correspondência parcial encontrada - descrições similares';
            field = 'description';
          }

          items.push({
            id: `${bankTx.id}-${partialMatch.id}`,
            bankTransaction: bankTx,
            systemTransaction: partialMatch,
            status: 'discrepancy',
            difference: Math.abs(Math.abs(bankTx.amount) - partialMatch.amount),
            discrepancyDetails: {
              reason,
              field,
              expectedValue: amountMatch ? undefined : partialMatch.amount,
              actualValue: amountMatch ? undefined : Math.abs(bankTx.amount),
              expectedDate: dateMatch ? undefined : partialMatch.createdAt,
              actualDate: dateMatch ? undefined : bankTx.date,
            },
          });
          matchedSystemTransactions.add(partialMatch.id);
          matchedBankTransactions.add(bankTx.id);
        }
      });

      // Add unmatched bank transactions
      statementsToUse.forEach(bankTx => {
        if (!matchedBankTransactions.has(bankTx.id)) {
          items.push({
            id: `bank-${bankTx.id}`,
            bankTransaction: bankTx,
            systemTransaction: null,
            status: 'unmatched_bank',
          });
        }
      });

      // Add unmatched system transactions
      systemTransactions.forEach(sysTx => {
        if (!matchedSystemTransactions.has(sysTx.id)) {
          items.push({
            id: `system-${sysTx.id}`,
            bankTransaction: null,
            systemTransaction: sysTx,
            status: 'unmatched_system',
          });
        }
      });

      setReconciliationItems(items);

      // Calculate summary
      const summary: ReconciliationSummary = {
        totalBankTransactions: statementsToUse.length,
        totalSystemTransactions: systemTransactions.length,
        matchedCount: items.filter(item => item.status === 'matched').length,
        unmatchedBankCount: items.filter(
          item => item.status === 'unmatched_bank'
        ).length,
        unmatchedSystemCount: items.filter(
          item => item.status === 'unmatched_system'
        ).length,
        discrepancyCount: items.filter(item => item.status === 'discrepancy')
          .length,
        totalDifference: items.reduce((sum, item) => {
          if (item.bankTransaction && item.systemTransaction) {
            return (
              sum +
              Math.abs(
                Math.abs(item.bankTransaction.amount) -
                  item.systemTransaction.amount
              )
            );
          }
          return sum;
        }, 0),
      };

      setReconciliationSummary(summary);

      toast({
        title: 'Conciliação Concluída',
        description: `${summary.matchedCount} transações conciliadas automaticamente`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao realizar conciliação',
        variant: 'destructive',
      });
    } finally {
      setReconciliationLoading(false);
    }
  };

  // Manual match transactions
  const manualMatch = async (bankTxId: string, systemTxId: string) => {
    try {
      const bankTx = bankStatements.find(b => b.id === bankTxId);
      const systemTx = transactions.find(s => s.id === systemTxId);

      if (!bankTx || !systemTx) return;

      const newItem: ReconciliationItem = {
        id: `${bankTxId}-${systemTxId}`,
        bankTransaction: bankTx,
        systemTransaction: systemTx,
        status: 'matched',
        matchedAt: new Date().toISOString(),
        notes: 'Conciliação manual',
      };

      // Remove existing unmatched items and add new matched item
      setReconciliationItems(prev => [
        ...prev.filter(
          item =>
            item.bankTransaction?.id !== bankTxId &&
            item.systemTransaction?.id !== systemTxId
        ),
        newItem,
      ]);

      toast({
        title: 'Sucesso',
        description: 'Transações conciliadas manualmente',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao conciliar transações',
        variant: 'destructive',
      });
    }
  };

  // Get reconciliation status badge
  const getReconciliationStatusBadge = (
    status: ReconciliationItem['status']
  ): { variant: any; label: string; icon: any } => {
    switch (status) {
      case 'matched':
        return { variant: 'default', label: 'Conciliado', icon: CheckCircle };
      case 'unmatched_bank':
        return {
          variant: 'destructive',
          label: 'Não encontrado no sistema',
          icon: XCircle,
        };
      case 'unmatched_system':
        return {
          variant: 'secondary',
          label: 'Não encontrado no banco',
          icon: Clock,
        };
      case 'discrepancy':
        return { variant: 'outline', label: 'Discrepância', icon: AlertCircle };
      default:
        return { variant: 'secondary', label: 'Pendente', icon: Clock };
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

  // Translate transaction types to Portuguese
  const getTransactionTypeLabel = (type: string): string => {
    const translations = {
      MEMBERSHIP_PAYMENT: 'Pagamento de Assinatura',
      INVESTMENT: 'Investimento',
      RETURN: 'Retorno',
      REFERRAL_BONUS: 'Bônus de Indicação',
      LOTTERY_PURCHASE: 'Compra de Loteria',
      LOTTERY_PRIZE: 'Prêmio de Loteria',
      investment: 'Investimento',
      commission: 'Comissão',
      withdrawal: 'Saque',
      refund: 'Reembolso',
    };
    return translations[type as keyof typeof translations] || type;
  };

  // Translate status to Portuguese
  const getStatusLabel = (status: string): string => {
    const translations = {
      PENDING: 'Pendente',
      COMPLETED: 'Concluído',
      FAILED: 'Falhou',
      CANCELLED: 'Cancelado',
      REFUNDED: 'Reembolsado',
      pending: 'Pendente',
      completed: 'Concluído',
      failed: 'Falhou',
      cancelled: 'Cancelado',
      refunded: 'Reembolsado',
    };
    return translations[status as keyof typeof translations] || status;
  };

  // Get transaction type badge
  const getTransactionTypeBadge = (
    type: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants = {
      MEMBERSHIP_PAYMENT: 'secondary' as const,
      INVESTMENT: 'default' as const,
      RETURN: 'default' as const,
      REFERRAL_BONUS: 'secondary' as const,
      LOTTERY_PURCHASE: 'outline' as const,
      LOTTERY_PRIZE: 'default' as const,
      investment: 'default' as const,
      commission: 'secondary' as const,
      withdrawal: 'outline' as const,
      refund: 'destructive' as const,
    };
    return variants[type as keyof typeof variants] || 'secondary';
  };

  // Get status badge
  const getStatusBadge = (
    status: string
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    const variants = {
      PENDING: 'secondary' as const,
      COMPLETED: 'default' as const,
      FAILED: 'destructive' as const,
      CANCELLED: 'outline' as const,
      REFUNDED: 'destructive' as const,
      pending: 'secondary' as const,
      completed: 'default' as const,
      failed: 'destructive' as const,
      cancelled: 'outline' as const,
      refunded: 'destructive' as const,
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
          <h1 className="text-3xl font-bold text-gray-900">
            Controle Financeiro
          </h1>
          <p className="text-gray-600">
            Dashboard financeiro e controle de transações
          </p>
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
              <CardTitle className="text-sm font-medium">
                Receita Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metrics.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className={getGrowthColor(metrics.revenueGrowth)}>
                  {formatPercentage(metrics.revenueGrowth)}
                </span>{' '}
                vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Investimentos
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metrics.totalInvestments)}
              </div>
              <p className="text-xs text-muted-foreground">
                <span className={getGrowthColor(metrics.investmentGrowth)}>
                  {formatPercentage(metrics.investmentGrowth)}
                </span>{' '}
                vs período anterior
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissões</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(metrics.totalCommissions)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(metrics.monthlyCommissions)} este mês
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Investidores Ativos
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.activeInvestors}
              </div>
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
          {/* Financial Metrics Explanation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-blue-500" />
                Entenda os Indicadores Financeiros
              </CardTitle>
              <CardDescription>
                Explicação detalhada dos componentes de receita da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 border rounded-lg bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <h4 className="font-semibold text-blue-700">
                      Investimentos
                    </h4>
                  </div>
                  <p className="text-sm text-blue-600">
                    Valor total investido pelos usuários nas oportunidades de
                    investimento disponíveis na plataforma.
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-amber-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <h4 className="font-semibold text-amber-700">Comissões</h4>
                  </div>
                  <p className="text-sm text-amber-600">
                    Taxa de administração cobrada sobre os investimentos
                    (normalmente 2-5% do valor investido).
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <h4 className="font-semibold text-green-700">
                      Receita Total
                    </h4>
                  </div>
                  <p className="text-sm text-green-600">
                    Soma de todas as fontes de receita: investimentos +
                    comissões + taxas mensais dos usuários.
                  </p>
                </div>

                <div className="p-4 border rounded-lg bg-purple-50">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <h4 className="font-semibold text-purple-700">
                      Taxas Mensais
                    </h4>
                  </div>
                  <p className="text-sm text-purple-600">
                    Valor arrecadado das assinaturas mensais pagas pelos
                    usuários para acesso à plataforma (R$ 20/mês).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução da Receita</CardTitle>
              <CardDescription>
                Receita, investimentos e comissões ao longo do tempo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      tickFormatter={value =>
                        `R$ ${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        name === 'revenue'
                          ? 'Receita Total'
                          : name === 'investments'
                            ? 'Investimentos'
                            : name === 'commissions'
                              ? 'Comissões'
                              : name === 'monthlyFees'
                                ? 'Taxas Mensais'
                                : name,
                      ]}
                      labelFormatter={label => `Mês: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Receita Total"
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="investments"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Investimentos"
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="commissions"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      name="Comissões"
                      dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="monthlyFees"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      name="Taxas Mensais"
                      dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Distribuição Mensal</CardTitle>
              <CardDescription>
                Comparação visual dos investimentos, comissões e taxas mensais
                por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      tickFormatter={value =>
                        `R$ ${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                        name === 'investments'
                          ? 'Investimentos'
                          : name === 'commissions'
                            ? 'Comissões'
                            : name === 'monthlyFees'
                              ? 'Taxas Mensais'
                              : name,
                      ]}
                      labelFormatter={label => `Mês: ${label}`}
                    />
                    <Legend />
                    <Bar
                      dataKey="investments"
                      fill="#3b82f6"
                      name="Investimentos"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="commissions"
                      fill="#f59e0b"
                      name="Comissões"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="monthlyFees"
                      fill="#8b5cf6"
                      name="Taxas Mensais"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Receita Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {metrics
                    ? formatCurrency(metrics.monthlyRevenue)
                    : formatCurrency(0)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Meta: {formatCurrency(500000)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full"
                    style={{
                      width: `${metrics ? Math.min((metrics.monthlyRevenue / 500000) * 100, 100) : 0}%`,
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
                  {metrics
                    ? formatCurrency(metrics.monthlyInvestments)
                    : formatCurrency(0)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Meta: {formatCurrency(2000000)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{
                      width: `${metrics ? Math.min((metrics.monthlyInvestments / 2000000) * 100, 100) : 0}%`,
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
                <div className="text-3xl font-bold text-amber-600">
                  {metrics
                    ? formatCurrency(metrics.monthlyCommissions)
                    : formatCurrency(0)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Meta: {formatCurrency(100000)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-amber-600 h-2 rounded-full"
                    style={{
                      width: `${metrics ? Math.min((metrics.monthlyCommissions / 100000) * 100, 100) : 0}%`,
                    }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Taxas Mensais (Assinaturas)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600">
                  {metrics
                    ? formatCurrency(metrics.currentMonthFees)
                    : formatCurrency(0)}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Total arrecadado este mês em assinaturas
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Total histórico:{' '}
                  {metrics
                    ? formatCurrency(metrics.totalMonthlyFees)
                    : formatCurrency(0)}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-purple-600 h-2 rounded-full"
                    style={{
                      width: `${metrics ? Math.min((metrics.currentMonthFees / 50000) * 100, 100) : 0}%`,
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
                <Select
                  value={transactionFilter}
                  onValueChange={setTransactionFilter}
                >
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
                    {transactions.map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell className="font-mono text-sm">
                          {transaction.id.slice(0, 8)}...
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant={getTransactionTypeBadge(transaction.type)}
                          >
                            {getTransactionTypeLabel(transaction.type)}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {transaction.userName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.userEmail}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {transaction.description}
                            </div>
                            {transaction.opportunityTitle && (
                              <div className="text-sm text-gray-500">
                                {transaction.opportunityTitle}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="font-medium">
                          {formatCurrency(transaction.amount)}
                        </TableCell>

                        <TableCell>
                          <Badge variant={getStatusBadge(transaction.status)}>
                            {getStatusLabel(transaction.status)}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {new Date(transaction.createdAt).toLocaleDateString(
                            'pt-BR'
                          )}
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
                  <h3 className="font-semibold mb-2">
                    Relatório de Investimentos
                  </h3>
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
          {/* Reconciliation Summary */}
          {reconciliationSummary && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Conciliadas</p>
                      <p className="text-2xl font-bold text-green-600">
                        {reconciliationSummary.matchedCount}
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Pendentes</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {reconciliationSummary.unmatchedBankCount +
                          reconciliationSummary.unmatchedSystemCount}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Discrepâncias</p>
                      <p className="text-2xl font-bold text-red-600">
                        {reconciliationSummary.discrepancyCount}
                      </p>
                    </div>
                    <XCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600">Diferença Total</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(reconciliationSummary.totalDifference)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Upload and Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Conciliação Bancária</CardTitle>
              <CardDescription>
                Faça upload do extrato bancário e realize a conciliação
                automática
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={uploadingStatement}
                    onClick={() =>
                      document.getElementById('statement-upload')?.click()
                    }
                  >
                    {uploadingStatement ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Carregar Extrato Bancário
                      </>
                    )}
                  </Button>
                  <input
                    id="statement-upload"
                    type="file"
                    accept=".csv,.xlsx,.xls,.ofx"
                    className="hidden"
                    onChange={handleStatementUpload}
                    disabled={uploadingStatement}
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Suporte para CSV, Excel (.xlsx, .xls) e OFX
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => performReconciliation()}
                    disabled={
                      reconciliationLoading || bankStatements.length === 0
                    }
                    variant="default"
                  >
                    {reconciliationLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Conciliando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reconciliar
                      </>
                    )}
                  </Button>

                  {reconciliationItems.length > 0 && (
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reconciliation Results */}
          {reconciliationItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Resultados da Conciliação</CardTitle>
                <CardDescription>
                  Transações conciliadas e pendências identificadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-64">Status</TableHead>
                        <TableHead>Data Banco</TableHead>
                        <TableHead className="max-w-xs">
                          Descrição Banco
                        </TableHead>
                        <TableHead>Valor Banco</TableHead>
                        <TableHead>Data Sistema</TableHead>
                        <TableHead className="max-w-xs">
                          Descrição Sistema
                        </TableHead>
                        <TableHead>Valor Sistema</TableHead>
                        <TableHead>Diferença</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationItems.map(item => {
                        const statusInfo = getReconciliationStatusBadge(
                          item.status
                        );
                        const StatusIcon = statusInfo.icon;

                        return (
                          <TableRow key={item.id}>
                            <TableCell className="w-64">
                              <div className="space-y-2">
                                <Badge
                                  variant={statusInfo.variant}
                                  className="flex items-center gap-1 w-fit"
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {statusInfo.label}
                                </Badge>
                                {/* Show discrepancy details */}
                                {item.status === 'discrepancy' &&
                                  item.discrepancyDetails && (
                                    <div className="text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                                      <div className="font-medium text-yellow-800 mb-1">
                                        💡 Detalhes da Discrepância:
                                      </div>
                                      <div className="text-gray-700">
                                        {item.discrepancyDetails.reason}
                                      </div>
                                      {item.discrepancyDetails.expectedValue &&
                                        item.discrepancyDetails.actualValue && (
                                          <div className="mt-1 flex flex-col gap-1">
                                            <div className="text-red-600">
                                              💰 Esperado: R${' '}
                                              {item.discrepancyDetails.expectedValue.toFixed(
                                                2
                                              )}
                                            </div>
                                            <div className="text-blue-600">
                                              💸 Encontrado: R${' '}
                                              {item.discrepancyDetails.actualValue.toFixed(
                                                2
                                              )}
                                            </div>
                                          </div>
                                        )}
                                      {item.discrepancyDetails.expectedDate &&
                                        item.discrepancyDetails.actualDate && (
                                          <div className="mt-1 flex flex-col gap-1">
                                            <div className="text-red-600">
                                              📅 Data Esperada:{' '}
                                              {new Date(
                                                item.discrepancyDetails.expectedDate
                                              ).toLocaleDateString('pt-BR')}
                                            </div>
                                            <div className="text-blue-600">
                                              📅 Data Encontrada:{' '}
                                              {new Date(
                                                item.discrepancyDetails.actualDate
                                              ).toLocaleDateString('pt-BR')}
                                            </div>
                                          </div>
                                        )}
                                    </div>
                                  )}
                              </div>
                            </TableCell>

                            <TableCell>
                              {item.bankTransaction
                                ? new Date(
                                    item.bankTransaction.date
                                  ).toLocaleDateString('pt-BR')
                                : '-'}
                            </TableCell>

                            <TableCell className="max-w-xs truncate">
                              {item.bankTransaction?.description || '-'}
                            </TableCell>

                            <TableCell className="font-medium">
                              {item.bankTransaction
                                ? formatCurrency(
                                    Math.abs(item.bankTransaction.amount)
                                  )
                                : '-'}
                            </TableCell>

                            <TableCell>
                              {item.systemTransaction
                                ? new Date(
                                    item.systemTransaction.createdAt
                                  ).toLocaleDateString('pt-BR')
                                : '-'}
                            </TableCell>

                            <TableCell className="max-w-xs truncate">
                              {item.systemTransaction?.description || '-'}
                            </TableCell>

                            <TableCell className="font-medium">
                              {item.systemTransaction
                                ? formatCurrency(item.systemTransaction.amount)
                                : '-'}
                            </TableCell>

                            <TableCell>
                              {item.bankTransaction &&
                              item.systemTransaction ? (
                                <span
                                  className={
                                    Math.abs(
                                      Math.abs(item.bankTransaction.amount) -
                                        item.systemTransaction.amount
                                    ) > 0.01
                                      ? 'text-red-600 font-medium'
                                      : 'text-green-600'
                                  }
                                >
                                  {formatCurrency(
                                    Math.abs(
                                      Math.abs(item.bankTransaction.amount) -
                                        item.systemTransaction.amount
                                    )
                                  )}
                                </span>
                              ) : (
                                '-'
                              )}
                            </TableCell>

                            <TableCell>
                              {item.status === 'unmatched_bank' && (
                                <Select
                                  onValueChange={value =>
                                    manualMatch(item.bankTransaction!.id, value)
                                  }
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue placeholder="Conciliar" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {transactions
                                      .filter(
                                        t =>
                                          !reconciliationItems.some(
                                            r =>
                                              r.systemTransaction?.id ===
                                                t.id && r.status === 'matched'
                                          )
                                      )
                                      .map(transaction => (
                                        <SelectItem
                                          key={transaction.id}
                                          value={transaction.id}
                                        >
                                          {formatCurrency(transaction.amount)} -{' '}
                                          {transaction.description.substring(
                                            0,
                                            30
                                          )}
                                          ...
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                              )}

                              {item.status === 'discrepancy' && (
                                <div className="space-y-1">
                                  <Button size="sm" variant="outline">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    Revisar
                                  </Button>
                                  {item.discrepancyDetails && (
                                    <div className="text-xs text-gray-500">
                                      {item.discrepancyDetails.field ===
                                        'amount' && '⚠️ Valor'}
                                      {item.discrepancyDetails.field ===
                                        'date' && '📅 Data'}
                                      {item.discrepancyDetails.field ===
                                        'description' && '📝 Descrição'}
                                      {item.discrepancyDetails.field ===
                                        'multiple' && '🔀 Múltiplo'}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {reconciliationItems.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      Nenhuma transação para conciliar
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Getting Started */}
          {reconciliationItems.length === 0 && bankStatements.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Como Usar a Conciliação</CardTitle>
                <CardDescription>
                  Siga os passos abaixo para realizar a conciliação bancária
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                      <Upload className="h-6 w-6 text-blue-600" />
                    </div>
                    <h3 className="font-semibold mb-2">1. Carregar Extrato</h3>
                    <p className="text-sm text-gray-600">
                      Faça upload do extrato bancário nos formatos CSV, Excel ou
                      OFX
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="bg-green-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                      <RefreshCw className="h-6 w-6 text-green-600" />
                    </div>
                    <h3 className="font-semibold mb-2">
                      2. Conciliação Automática
                    </h3>
                    <p className="text-sm text-gray-600">
                      O sistema irá automaticamente comparar e conciliar as
                      transações
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="bg-purple-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-6 w-6 text-purple-600" />
                    </div>
                    <h3 className="font-semibold mb-2">3. Revisão Manual</h3>
                    <p className="text-sm text-gray-600">
                      Revise e concilie manualmente as transações pendentes
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
