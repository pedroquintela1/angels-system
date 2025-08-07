'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { Target, DollarSign, Calendar, TrendingUp, Filter, Search, Eye, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/utils';
import { translateInvestmentStatus, UI_TEXTS } from '@/lib/translations';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  status: string;
  targetAmount: number;
  currentAmount: number;
  minInvestment: number;
  maxInvestment: number;
  startDate: string;
  endDate: string;
  investorsCount: number;
  documents: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  userInvestment?: {
    amount: number;
    investedAt: string;
  };
}

interface OpportunitiesData {
  opportunities: Opportunity[];
  categories: string[];
  riskLevels: string[];
}

export default function OpportunitiesPage() {
  const { data: session } = useSession();
  const [opportunitiesData, setOpportunitiesData] = useState<OpportunitiesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('');
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [showInvestModal, setShowInvestModal] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchOpportunities();
    }
  }, [session]);

  const fetchOpportunities = async () => {
    try {
      const response = await fetch('/api/user/opportunities');
      if (!response.ok) {
        throw new Error(UI_TEXTS.ERROR_LOADING);
      }
      const data = await response.json();
      setOpportunitiesData(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : UI_TEXTS.ERROR_UNKNOWN);
    } finally {
      setLoading(false);
    }
  };

  const filteredOpportunities = opportunitiesData?.opportunities.filter(opportunity => {
    const matchesSearch = opportunity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         opportunity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || opportunity.category === selectedCategory;
    const matchesRiskLevel = !selectedRiskLevel || opportunity.riskLevel === selectedRiskLevel;
    
    return matchesSearch && matchesCategory && matchesRiskLevel;
  }) || [];

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
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

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'REAL_ESTATE':
        return 'Imóveis';
      case 'TECHNOLOGY':
        return 'Tecnologia';
      case 'RETAIL':
        return 'Varejo';
      case 'AGRICULTURE':
        return 'Agronegócio';
      default:
        return category;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-80 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Oportunidades</h1>
          <p className="text-red-600">Erro: {error}</p>
        </div>
      </div>
    );
  }

  if (!opportunitiesData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Oportunidades de Investimento</h1>
        <p className="text-gray-600">Explore e invista em oportunidades selecionadas</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Buscar
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar oportunidades..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Categoria
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas as categorias</option>
                {/* Categorias serão implementadas futuramente */}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Nível de Risco
              </label>
              <select
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os níveis</option>
                {/* Níveis de risco serão implementados futuramente */}
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('');
                  setSelectedRiskLevel('');
                }}
                className="w-full"
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Oportunidades */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredOpportunities.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma oportunidade encontrada
            </h3>
            <p className="text-gray-600">
              Tente ajustar os filtros para encontrar oportunidades.
            </p>
          </div>
        ) : (
          filteredOpportunities.map((opportunity) => (
            <Card key={opportunity.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-2">{opportunity.title}</CardTitle>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={getRiskBadgeVariant(opportunity.riskLevel)}>
                        {getRiskLabel(opportunity.riskLevel)}
                      </Badge>
                      <Badge variant="outline">
                        {getCategoryLabel(opportunity.category)}
                      </Badge>
                      <Badge variant={opportunity.status === 'ACTIVE' ? 'info' : 'success'}>
                        {translateInvestmentStatus(opportunity.status)}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardDescription className="line-clamp-3">
                  {opportunity.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Progresso da Captação */}
                <div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Captação</span>
                    <span>
                      {getProgressPercentage(opportunity.currentAmount, opportunity.targetAmount).toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${getProgressPercentage(opportunity.currentAmount, opportunity.targetAmount)}%`
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{formatCurrency(opportunity.currentAmount)}</span>
                    <span>{formatCurrency(opportunity.targetAmount)}</span>
                  </div>
                </div>

                {/* Informações Principais */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500">Investimento Mínimo</label>
                    <p className="font-semibold text-blue-600">
                      {formatCurrency(opportunity.minInvestment)}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500">Retorno Esperado</label>
                    <p className="font-semibold text-green-600">
                      12-18% a.a.
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500">Prazo</label>
                    <p className="font-semibold text-gray-900">
                      {formatDate(opportunity.endDate)}
                    </p>
                  </div>
                  <div>
                    <label className="text-gray-500">Investidores</label>
                    <p className="font-semibold text-gray-900">
                      {opportunity.investorsCount}
                    </p>
                  </div>
                </div>

                {/* Localização */}
                <div>
                  <label className="text-sm text-gray-500">Localização</label>
                  <p className="text-sm font-medium text-gray-900">
                    {opportunity.title.includes('Campinas') ? 'Campinas, SP' :
                     opportunity.title.includes('São Paulo') ? 'São Paulo, SP' :
                     opportunity.title.includes('RJ') ? 'Rio de Janeiro, RJ' : 'Brasil'}
                  </p>
                </div>

                {/* Investimento do Usuário */}
                {opportunity.userInvestment && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-900">
                        Você já investiu
                      </span>
                    </div>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(opportunity.userInvestment.amount)}
                    </p>
                    <p className="text-xs text-blue-700">
                      Investido em {formatDate(opportunity.userInvestment.investedAt)}
                    </p>
                  </div>
                )}

                {/* Ações */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedOpportunity(opportunity)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  {opportunity.status === 'ACTIVE' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedOpportunity(opportunity);
                        setShowInvestModal(true);
                      }}
                      className="flex-1"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Investir
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
