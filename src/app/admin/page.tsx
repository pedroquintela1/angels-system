'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  translateTicketStatus,
  translateTicketPriority,
  translateInvestmentStatus,
  UI_TEXTS
} from '@/lib/translations';

interface AdminDashboardData {
  stats: {
    totalUsers: number;
    activeUsers: number;
    totalInvestments: number;
    monthlyRevenue: number;
    pendingTickets: number;
    activeOpportunities: number;
  };
  recentTickets: Array<{
    id: string;
    subject: string;
    user: string;
    userEmail: string;
    priority: string;
    status: string;
    createdAt: string;
  }>;
  recentOpportunities: Array<{
    id: string;
    title: string;
    targetAmount: number;
    currentAmount: number;
    status: string;
    investorsCount: number;
    progress: number;
    createdAt: string;
  }>;
  topOpportunities: Array<{
    id: string;
    title: string;
    currentAmount: number;
    investorsCount: number;
    status: string;
  }>;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string;
    status: string;
    user: string;
    createdAt: string;
  }>;
}

export default function AdminDashboardPage() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user) {
      fetchDashboardData();
    }
  }, [session]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
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
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
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
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
  }

  const { stats, recentTickets, recentOpportunities, topOpportunities, recentTransactions } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Administrativo</h1>
        <p className="text-gray-600">Visão geral do sistema e métricas principais</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalUsers.toLocaleString()}
            </div>
            <p className="text-sm text-green-600">
              {stats.activeUsers} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Volume Total Investido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalInvestments)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Receita Mensal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.monthlyRevenue)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Tickets Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.pendingTickets}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Oportunidades Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.activeOpportunities}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Tickets Recentes</CardTitle>
          <CardDescription>
            Últimos tickets de suporte abertos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhum ticket encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium">{ticket.subject}</h3>
                    <p className="text-sm text-gray-600">
                      Por: {ticket.user}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(ticket.createdAt)}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge
                      variant={
                        ticket.priority === 'HIGH' ? 'destructive' :
                        ticket.priority === 'MEDIUM' ? 'warning' : 'secondary'
                      }
                    >
                      {translateTicketPriority(ticket.priority)}
                    </Badge>
                    <div>
                      <Badge
                        variant={
                          ticket.status === 'OPEN' ? 'destructive' :
                          ticket.status === 'IN_PROGRESS' ? 'warning' : 'success'
                        }
                      >
                        {translateTicketStatus(ticket.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Oportunidades Recentes</CardTitle>
          <CardDescription>
            Últimas oportunidades criadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentOpportunities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhuma oportunidade encontrada
            </p>
          ) : (
            <div className="space-y-4">
              {recentOpportunities.map((opportunity) => (
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
                      {opportunity.investorsCount} investidores
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={opportunity.status === 'ACTIVE' ? 'info' : 'success'}
                    >
                      {translateInvestmentStatus(opportunity.status)}
                    </Badge>
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

      {/* Top Opportunities */}
      <Card>
        <CardHeader>
          <CardTitle>Oportunidades com Maior Captação</CardTitle>
          <CardDescription>
            Oportunidades que mais captaram recursos
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topOpportunities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhuma oportunidade encontrada
            </p>
          ) : (
            <div className="space-y-4">
              {topOpportunities.map((opportunity, index) => (
                <div
                  key={opportunity.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className="font-medium">{opportunity.title}</h3>
                      <p className="text-sm text-gray-600">
                        {opportunity.investorsCount} investidores
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(opportunity.currentAmount)}
                    </div>
                    <Badge variant={opportunity.status === 'ACTIVE' ? 'info' : 'success'}>
                      {translateInvestmentStatus(opportunity.status)}
                    </Badge>
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
