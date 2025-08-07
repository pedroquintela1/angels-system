'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { CreditCard, Calendar, CheckCircle, AlertCircle, Clock, DollarSign } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { translateMembershipStatus, translateTransactionStatus, UI_TEXTS } from '@/lib/translations';

interface MembershipData {
  membership: {
    status: string;
    nextPaymentDate: string;
    monthlyFee: number;
    joinedAt: string;
    totalPaid: number;
    consecutiveMonths: number;
  };
  paymentHistory: Array<{
    id: string;
    amount: number;
    status: string;
    description: string;
    createdAt: string;
    paidAt?: string;
    method?: string;
  }>;
  benefits: Array<{
    title: string;
    description: string;
    active: boolean;
  }>;
}

export default function MembershipPage() {
  const { data: session } = useSession();
  const [membershipData, setMembershipData] = useState<MembershipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchMembershipData();
    }
  }, [session]);

  const fetchMembershipData = async () => {
    try {
      const response = await fetch('/api/user/membership');
      if (!response.ok) {
        throw new Error(UI_TEXTS.ERROR_LOADING);
      }
      const data = await response.json();
      setMembershipData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : UI_TEXTS.ERROR_UNKNOWN);
    } finally {
      setLoading(false);
    }
  };

  const handleRenewMembership = async () => {
    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/user/membership/renew', {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Erro ao renovar membership');
      }

      await fetchMembershipData();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao processar pagamento');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'INACTIVE':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'SUSPENDED':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'FAILED':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Membership</h1>
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!membershipData) {
    return null;
  }

  const { membership, paymentHistory, benefits } = membershipData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Membership</h1>
        <p className="text-gray-600">Gerencie sua assinatura e histórico de pagamentos</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Status do Membership */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Status do Membership
            </CardTitle>
            <CardDescription>
              Informações da sua assinatura atual
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              {getStatusIcon(membership.status)}
              <div>
                <Badge variant={membership.status === 'ACTIVE' ? 'success' : 'destructive'}>
                  {translateMembershipStatus(membership.status)}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Mensalidade</label>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(membership.monthlyFee)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Próximo Pagamento</label>
                <p className="text-lg font-semibold text-gray-900">
                  {formatDate(membership.nextPaymentDate)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Membro desde</label>
                <p className="text-gray-900">{formatDate(membership.joinedAt)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Meses consecutivos</label>
                <p className="text-gray-900">{membership.consecutiveMonths}</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Total pago</label>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(membership.totalPaid)}
              </p>
            </div>

            {membership.status === 'ACTIVE' && (
              <Button
                onClick={handleRenewMembership}
                loading={processing}
                disabled={processing}
                className="w-full"
              >
                {processing ? 'Processando...' : 'Renovar Antecipadamente'}
              </Button>
            )}

            {membership.status !== 'ACTIVE' && (
              <Button
                onClick={handleRenewMembership}
                loading={processing}
                disabled={processing}
                className="w-full"
              >
                {processing ? 'Processando...' : 'Reativar Membership'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Benefícios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Benefícios do Membership
            </CardTitle>
            <CardDescription>
              Vantagens da sua assinatura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle className={`h-5 w-5 mt-0.5 ${benefit.active ? 'text-green-500' : 'text-gray-300'}`} />
                  <div>
                    <h4 className={`font-medium ${benefit.active ? 'text-gray-900' : 'text-gray-500'}`}>
                      {benefit.title}
                    </h4>
                    <p className={`text-sm ${benefit.active ? 'text-gray-600' : 'text-gray-400'}`}>
                      {benefit.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Histórico de Pagamentos
          </CardTitle>
          <CardDescription>
            Todos os seus pagamentos de membership
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nenhum pagamento encontrado
            </p>
          ) : (
            <div className="space-y-4">
              {paymentHistory.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPaymentStatusIcon(payment.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">{payment.description}</h4>
                      <p className="text-sm text-gray-600">
                        {formatDate(payment.createdAt)}
                        {payment.paidAt && ` • Pago em ${formatDate(payment.paidAt)}`}
                        {payment.method && ` • ${payment.method}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <Badge
                      variant={
                        payment.status === 'COMPLETED' ? 'success' :
                        payment.status === 'PENDING' ? 'warning' : 'destructive'
                      }
                    >
                      {translateTransactionStatus(payment.status)}
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
