'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Calendar, Target, BarChart3, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { translateInvestmentStatus, UI_TEXTS } from '@/lib/translations';

interface Investment {
  id: string;
  amount: number;
  investedAt: string;
  opportunity: {
    id: string;
    title: string;
    description: string;
    status: string;
    targetAmount: number;
    currentAmount: number;
    deadline: string;
    expectedReturn: number;
    riskLevel: string;
  };
  returns: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    paidAt: string;
  }>;
  totalReturns: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
}

interface InvestmentStats {
  totalInvested: number;
  totalReturns: number;
  activeInvestments: number;
  completedInvestments: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
}

interface InvestmentsData {
  stats: InvestmentStats;
  investments: Investment[];
}

export default function InvestmentsPage() {
  const { data: session } = useSession();
  const [investmentsData, setInvestmentsData] = useState<InvestmentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchInvestmentsData();
    }
  }, [session]);

  const fetchInvestmentsData = async () => {
    try {
      const response = await fetch('/api/user/investments');
      if (!response.ok) {
        throw new Error(UI_TEXTS.ERROR_LOADING);
      }
      const data = await response.json();
      setInvestmentsData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : UI_TEXTS.ERROR_UNKNOWN);
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return 'success';
      case 'MEDIUM':
        return 'warning';
      case 'HIGH':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getRiskLabel = (riskLevel: string) => {
    switch (riskLevel) {
      case 'LOW':
        return 'Baixo Risco';
      case 'MEDIUM':
        return 'Médio Risco';
      case 'HIGH':
        return 'Alto Risco';
      default:
        return riskLevel;
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Meus Investimentos</h1>
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!investmentsData) {
    return null;
  }

  const { stats, investments } = investmentsData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Meus Investimentos</h1>
        <p className="text-gray-600">Acompanhe seus investimentos e retornos</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalInvested)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Total de Retornos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalReturns)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Investimentos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.activeInvestments}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Lucro/Prejuízo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.totalProfitLoss)}
            </div>
            <p className={`text-sm ${stats.totalProfitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.totalProfitLossPercentage >= 0 ? '+' : ''}{stats.totalProfitLossPercentage.toFixed(2)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Investimentos */}
      <Card>
        <CardHeader>
          <CardTitle>Portfólio de Investimentos</CardTitle>
          <CardDescription>
            Todos os seus investimentos e seu desempenho
          </CardDescription>
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum investimento encontrado
              </h3>
              <p className="text-gray-600 mb-4">
                Você ainda não fez nenhum investimento. Explore as oportunidades disponíveis.
              </p>
              <Button>
                Ver Oportunidades
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {investments.map((investment) => (
                <div key={investment.id} className="border rounded-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {investment.opportunity.title}
                      </h3>
                      <p className="text-gray-600 text-sm mb-3">
                        {investment.opportunity.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Investido em {formatDate(investment.investedAt)}</span>
                        <Badge variant={getRiskBadgeVariant(investment.opportunity.riskLevel)}>
                          {getRiskLabel(investment.opportunity.riskLevel)}
                        </Badge>
                        <Badge variant={investment.opportunity.status === 'ACTIVE' ? 'info' : 'success'}>
                          {translateInvestmentStatus(investment.opportunity.status)}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInvestment(investment)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Detalhes
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Valor Investido
                      </label>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatCurrency(investment.amount)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Retornos Recebidos
                      </label>
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(investment.totalReturns)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Valor Atual
                      </label>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatCurrency(investment.currentValue)}
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Lucro/Prejuízo
                      </label>
                      <p className={`text-lg font-semibold ${investment.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(investment.profitLoss)}
                      </p>
                      <p className={`text-sm ${investment.profitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {investment.profitLossPercentage >= 0 ? '+' : ''}{investment.profitLossPercentage.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Progresso da Captação</span>
                      <span>
                        {formatCurrency(investment.opportunity.currentAmount)} / {formatCurrency(investment.opportunity.targetAmount)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${getProgressPercentage(investment.opportunity.currentAmount, investment.opportunity.targetAmount)}%`
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Histórico de Retornos */}
                  {investment.returns.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Histórico de Retornos</h4>
                      <div className="space-y-2">
                        {investment.returns.slice(0, 3).map((returnItem) => (
                          <div key={returnItem.id} className="flex justify-between items-center text-sm">
                            <div>
                              <span className="text-gray-900">{returnItem.description}</span>
                              <span className="text-gray-500 ml-2">
                                {formatDate(returnItem.paidAt)}
                              </span>
                            </div>
                            <span className="font-semibold text-green-600">
                              {formatCurrency(returnItem.amount)}
                            </span>
                          </div>
                        ))}
                        {investment.returns.length > 3 && (
                          <p className="text-sm text-gray-500">
                            +{investment.returns.length - 3} retornos adicionais
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
