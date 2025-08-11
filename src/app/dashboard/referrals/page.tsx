'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Users, DollarSign, Share2, Copy, CheckCircle, Gift, TrendingUp } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { UI_TEXTS } from '@/lib/translations';

interface ReferralData {
  referralCode: string;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    totalBonusEarned: number;
    pendingBonuses: number;
  };
  referrals: Array<{
    id: string;
    referredUser: {
      firstName: string;
      lastName: string;
      email: string;
    };
    status: string;
    joinedAt: string;
    firstInvestmentAt?: string;
    totalInvested: number;
    bonusEarned: number;
    bonusStatus: string;
  }>;
  bonusHistory: Array<{
    id: string;
    amount: number;
    type: string;
    description: string;
    status: string;
    createdAt: string;
    paidAt?: string;
  }>;
  levels: Array<{
    level: number;
    name: string;
    requiredReferrals: number;
    bonusPercentage: number;
    benefits: string[];
    achieved: boolean;
    progress: number;
  }>;
}

export default function ReferralsPage() {
  const { data: session } = useSession();
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (session?.user) {
      fetchReferralData();
    }
  }, [session]);

  useEffect(() => {
    if (referralData?.referralCode) {
      setShareUrl(`${window.location.origin}/auth/signup?ref=${referralData.referralCode}`);
    }
  }, [referralData]);

  const fetchReferralData = async () => {
    try {
      const response = await fetch('/api/user/referrals');
      if (!response.ok) {
        throw new Error(UI_TEXTS.ERROR_LOADING);
      }
      const data = await response.json();
      setReferralData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : UI_TEXTS.ERROR_UNKNOWN);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Erro ao copiar:', error);
    }
  };

  const shareOnWhatsApp = () => {
    const message = `Olá! Conheça o Angels System, uma plataforma incrível de investimentos coletivos. Use meu código de indicação ${referralData?.referralCode} e ganhe benefícios exclusivos: ${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'success';
      case 'PENDING':
        return 'warning';
      case 'INACTIVE':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'Ativo';
      case 'PENDING':
        return 'Pendente';
      case 'INACTIVE':
        return 'Inativo';
      default:
        return status;
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
          <h1 className="text-3xl font-bold text-gray-900">Sistema de Indicações</h1>
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!referralData) {
    return null;
  }

  const { referralCode, stats, referrals, bonusHistory } = referralData;

  // Simular níveis baseado no número de indicações
  const levels = [
    {
      level: 1,
      name: 'Iniciante',
      minReferrals: 0,
      bonus: 50,
      achieved: true,
      progress: 100,
      benefits: ['Bônus de R$ 50 por indicação', 'Acesso ao programa de referência']
    },
    {
      level: 2,
      name: 'Intermediário',
      minReferrals: 5,
      bonus: 100,
      achieved: stats.totalReferrals >= 5,
      progress: Math.min(100, (stats.totalReferrals / 5) * 100),
      benefits: ['Bônus de R$ 100 por indicação', 'Bônus mensal adicional', 'Suporte prioritário']
    },
    {
      level: 3,
      name: 'Avançado',
      minReferrals: 10,
      bonus: 150,
      achieved: stats.totalReferrals >= 10,
      progress: Math.min(100, (stats.totalReferrals / 10) * 100),
      benefits: ['Bônus de R$ 150 por indicação', 'Comissão sobre indicações de 2º nível', 'Acesso a eventos exclusivos']
    },
    {
      level: 4,
      name: 'Expert',
      minReferrals: 25,
      bonus: 200,
      achieved: stats.totalReferrals >= 25,
      progress: Math.min(100, (stats.totalReferrals / 25) * 100),
      benefits: ['Bônus de R$ 200 por indicação', 'Comissão vitalícia', 'Consultoria personalizada']
    },
  ];

  const currentLevel = levels.find(level => level.achieved) || levels[0];
  const nextLevel = levels.find(level => !level.achieved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sistema de Indicações</h1>
        <p className="text-gray-600">Indique amigos e ganhe bônus por cada investimento</p>
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
              <Users className="h-4 w-4" />
              Total de Indicações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalReferrals}
            </div>
            <p className="text-sm text-green-600">
              {stats.activeReferrals} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Ganho
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalBonusEarned)}
            </div>
            <p className="text-sm text-yellow-600">
              {formatCurrency(stats.pendingBonuses)} pendente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Este Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              0
            </div>
            <p className="text-sm text-green-600">
              {formatCurrency(0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Nível Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {currentLevel.name}
            </div>
            <p className="text-sm text-gray-600">
              R$ {currentLevel.bonus} por indicação
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Compartilhar Código */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Seu Código de Indicação
            </CardTitle>
            <CardDescription>
              Compartilhe seu código e ganhe bônus
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Código de Indicação
              </label>
              <div className="flex gap-2">
                <Input
                  value={referralCode}
                  readOnly
                  className="font-mono text-lg font-bold text-center"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(referralCode)}
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Link de Indicação
              </label>
              <div className="flex gap-2">
                <Input
                  value={shareUrl}
                  readOnly
                  className="text-sm"
                />
                <Button
                  variant="outline"
                  onClick={() => copyToClipboard(shareUrl)}
                >
                  {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={shareOnWhatsApp} className="flex-1">
                Compartilhar no WhatsApp
              </Button>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(shareUrl)}
                className="flex-1"
              >
                Copiar Link
              </Button>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Como Funciona</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Compartilhe seu código com amigos</li>
                <li>• Eles se cadastram usando seu código</li>
                <li>• Você ganha bônus quando eles investem</li>
                <li>• Quanto mais indicações, maior seu nível e bônus</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Níveis e Benefícios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Níveis de Indicação
            </CardTitle>
            <CardDescription>
              Evolua seu nível e ganhe mais bônus
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {levels.map((level) => (
                <div
                  key={level.level}
                  className={`border rounded-lg p-4 ${
                    level.achieved ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">{level.name}</h4>
                      {level.achieved && (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                    <Badge variant={level.achieved ? 'success' : 'secondary'}>
                      R$ {level.bonus} bônus
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-2">
                    {level.minReferrals} indicações necessárias
                  </p>

                  {!level.achieved && (
                    <div className="mb-2">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progresso</span>
                        <span>{level.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${level.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    {level.benefits.map((benefit, index) => (
                      <p key={index} className="text-sm text-gray-700">
                        • {benefit}
                      </p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Indicações */}
      <Card>
        <CardHeader>
          <CardTitle>Suas Indicações</CardTitle>
          <CardDescription>
            Pessoas que se cadastraram usando seu código
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhuma indicação ainda
              </h3>
              <p className="text-gray-600">
                Compartilhe seu código e comece a ganhar bônus!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {referrals.map((referral) => (
                <div key={referral.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {referral.referredUser.firstName} {referral.referredUser.lastName}
                    </h4>
                    <p className="text-sm text-gray-600">{referral.referredUser.email}</p>
                    <p className="text-sm text-gray-500">
                      Cadastrou-se em {formatDate(referral.joinedAt)}
                      {referral.firstInvestmentAt && (
                        <> • Primeiro investimento em {formatDate(referral.firstInvestmentAt)}</>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={getStatusBadgeVariant(referral.status)}>
                      {getStatusLabel(referral.status)}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-1">
                      Investiu: {formatCurrency(referral.totalInvested)}
                    </p>
                    <p className="text-sm font-semibold text-green-600">
                      Seu bônus: {formatCurrency(referral.bonusEarned)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico de Bônus */}
      {bonusHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Bônus</CardTitle>
            <CardDescription>
              Todos os bônus recebidos por indicações
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bonusHistory.map((bonus) => (
                <div key={bonus.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{bonus.description}</h4>
                    <p className="text-sm text-gray-600">
                      {formatDate(bonus.createdAt)}
                      {bonus.paidAt && ` • Pago em ${formatDate(bonus.paidAt)}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      {formatCurrency(bonus.amount)}
                    </p>
                    <Badge variant={bonus.status === 'COMPLETED' ? 'success' : 'warning'}>
                      {bonus.status === 'COMPLETED' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
