'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  translateMembershipStatus,
  translateKycStatus,
  translateInvestmentStatus,
  UI_TEXTS
} from '@/lib/translations';

interface DashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    kycStatus: string;
    referralCode: string;
  };
  membership: {
    status: string;
    nextPaymentDate: string;
    monthlyFee: number;
  };
  stats: {
    totalInvested: number;
    totalReturns: number;
    activeInvestments: number;
    referralCount: number;
    referralBonus: number;
  };
  investments: Array<{
    id: string;
    amount: number;
    investedAt: string;
    opportunity: {
      id: string;
      title: string;
      status: string;
      targetAmount: number;
      currentAmount: number;
    };
    returns: Array<{
      amount: number;
      percentage: number;
      distributedAt: string;
    }>;
  }>;
  availableOpportunities: Array<{
    id: string;
    title: string;
    description: string;
    targetAmount: number;
    currentAmount: number;
    minInvestment: number;
    endDate: string;
    progress: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    status: string;
    createdAt: string;
  }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (!response.ok) {
        throw new Error(UI_TEXTS.ERROR_LOADING);
      }
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : UI_TEXTS.ERROR_UNKNOWN);
    } finally {
      setLoading(false);
    }
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
            <div key={i} className="animate-pulse">
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { user, membership, stats, investments, availableOpportunities, recentTransactions } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Bem-vindo, {user.name}!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {formatCurrency(stats.totalInvested)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
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
            <CardTitle className="text-sm font-medium text-gray-600">
              Investimentos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.activeInvestments}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Status Membership
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={membership.status === 'ACTIVE' ? 'success' : 'destructive'}>
              {translateMembershipStatus(membership.status)}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Sistema de Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-lg font-semibold">
                {stats.referralCount} indicações
              </div>
              <div className="text-sm text-gray-600">
                Bônus total: {formatCurrency(stats.referralBonus)}
              </div>
              <div className="text-xs text-gray-500">
                Seu código: <span className="font-mono font-bold">{user.referralCode}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Status KYC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={user.kycStatus === 'APPROVED' ? 'success' : 'warning'}>
              {translateKycStatus(user.kycStatus)}
            </Badge>
            {user.kycStatus === 'PENDING' && (
              <p className="text-sm text-gray-600 mt-2">
                Complete sua verificação para acessar todas as funcionalidades
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Investments */}
      <Card>
        <CardHeader>
          <CardTitle>Meus Investimentos</CardTitle>
          <CardDescription>
            Seus investimentos e retornos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {investments.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Você ainda não fez nenhum investimento
            </p>
          ) : (
            <div className="space-y-4">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{investment.opportunity.title}</h3>
                    <p className="text-sm text-gray-600">
                      Investido: {formatCurrency(investment.amount)} em {formatDate(investment.investedAt)}
                    </p>
                    {investment.returns.length > 0 && (
                      <p className="text-sm text-green-600">
                        Retorno: {formatCurrency(investment.returns.reduce((sum, ret) => sum + ret.amount, 0))}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={investment.opportunity.status === 'ACTIVE' ? 'info' : 'success'}
                    >
                      {translateInvestmentStatus(investment.opportunity.status)}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Oportunidades Disponíveis</CardTitle>
          <CardDescription>
            Novas oportunidades de investimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableOpportunities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhuma oportunidade disponível no momento
            </p>
          ) : (
            <div className="space-y-4">
              {availableOpportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{opportunity.title}</h3>
                    <p className="text-sm text-gray-600">
                      Meta: {formatCurrency(opportunity.targetAmount)} | 
                      Captado: {formatCurrency(opportunity.currentAmount)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Mínimo: {formatCurrency(opportunity.minInvestment)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      Prazo: {formatDate(opportunity.endDate)}
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${Math.min(opportunity.progress, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
