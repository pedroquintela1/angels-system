'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, CheckCircle, XCircle, DollarSign, Users, Calendar, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  status: string;
  category: string;
  riskLevel: string;
  investorCount: number;
  documents: any[];
  investments: Investment[];
  createdAt: string;
  updatedAt: string;
}

interface Investment {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function OpportunityDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOpportunity = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/opportunities/${params.id}`);
      
      if (response.ok) {
        const data = await response.json();
        setOpportunity(data.opportunity);
      } else {
        toast({
          title: 'Erro',
          description: 'Oportunidade não encontrada',
          variant: 'destructive',
        });
        router.push('/admin/opportunities');
      }
    } catch (error) {
      console.error('Error loading opportunity:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao carregar oportunidade',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    try {
      const response = await fetch(`/api/admin/opportunities/${params.id}`, {
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
        loadOpportunity();
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
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getStatusBadge = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants = {
      draft: 'secondary' as const,
      active: 'default' as const,
      funding: 'default' as const,
      funded: 'default' as const,
      closed: 'outline' as const,
      cancelled: 'destructive' as const,
    };
    return variants[status as keyof typeof variants] || 'secondary';
  };

  const getRiskBadge = (risk: string): "default" | "secondary" | "destructive" => {
    const variants = {
      low: 'default' as const,
      medium: 'secondary' as const,
      high: 'destructive' as const,
    };
    return variants[risk as keyof typeof variants] || 'secondary';
  };

  useEffect(() => {
    if (params.id) {
      loadOpportunity();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Carregando oportunidade...</p>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Oportunidade não encontrada</p>
      </div>
    );
  }

  const progress = calculateProgress(opportunity.currentAmount, opportunity.targetAmount);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/opportunities">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{opportunity.title}</h1>
            <p className="text-gray-600">Detalhes da oportunidade de investimento</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {opportunity.status === 'draft' && (
            <>
              <Button variant="outline" onClick={() => handleAction('approve')}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Aprovar
              </Button>
              <Button variant="outline" onClick={() => handleAction('reject')}>
                <XCircle className="h-4 w-4 mr-2" />
                Rejeitar
              </Button>
            </>
          )}
          
          {opportunity.status === 'active' && (
            <Button variant="outline" onClick={() => handleAction('close')}>
              <XCircle className="h-4 w-4 mr-2" />
              Fechar Captação
            </Button>
          )}
          
          <Link href={`/admin/opportunities/${opportunity.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <Badge variant={getStatusBadge(opportunity.status)}>
              {opportunity.status}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <Badge variant={getRiskBadge(opportunity.riskLevel)}>
                Risco {opportunity.riskLevel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Categoria: {opportunity.category.replace('_', ' ')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Captação</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(opportunity.currentAmount)}</div>
            <p className="text-xs text-muted-foreground">
              de {formatCurrency(opportunity.targetAmount)} ({formatPercentage(progress)})
            </p>
            <Progress value={progress} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Investidores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunity.investorCount}</div>
            <p className="text-xs text-muted-foreground">
              Mín: {formatCurrency(opportunity.minInvestment)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retorno</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(opportunity.expectedReturn)}</div>
            <p className="text-xs text-muted-foreground">
              Prazo: {new Date(opportunity.deadline).toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="investments">Investimentos ({opportunity.investments?.length || 0})</TabsTrigger>
          <TabsTrigger value="documents">Documentos ({opportunity.documents?.length || 0})</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-wrap">{opportunity.description}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Informações Financeiras</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Meta de Captação:</span>
                  <span className="font-medium">{formatCurrency(opportunity.targetAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor Captado:</span>
                  <span className="font-medium">{formatCurrency(opportunity.currentAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investimento Mínimo:</span>
                  <span className="font-medium">{formatCurrency(opportunity.minInvestment)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Retorno Esperado:</span>
                  <span className="font-medium">{formatPercentage(opportunity.expectedReturn)}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Informações Gerais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Categoria:</span>
                  <span className="font-medium capitalize">{opportunity.category.replace('_', ' ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nível de Risco:</span>
                  <Badge variant={getRiskBadge(opportunity.riskLevel)}>
                    {opportunity.riskLevel}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Prazo:</span>
                  <span className="font-medium">{new Date(opportunity.deadline).toLocaleDateString('pt-BR')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Criado em:</span>
                  <span className="font-medium">{new Date(opportunity.createdAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="investments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lista de Investimentos</CardTitle>
              <CardDescription>
                Todos os investimentos realizados nesta oportunidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              {opportunity.investments && opportunity.investments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investidor</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opportunity.investments.map((investment) => (
                      <TableRow key={investment.id}>
                        <TableCell>
                          {investment.user.firstName} {investment.user.lastName}
                        </TableCell>
                        <TableCell>{investment.user.email}</TableCell>
                        <TableCell>{formatCurrency(investment.amount)}</TableCell>
                        <TableCell>
                          <Badge variant={investment.status === 'confirmed' ? 'default' : 'secondary'}>
                            {investment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(investment.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum investimento realizado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Documentos da Oportunidade</CardTitle>
              <CardDescription>
                Documentos relacionados a esta oportunidade
              </CardDescription>
            </CardHeader>
            <CardContent>
              {opportunity.documents && opportunity.documents.length > 0 ? (
                <div className="space-y-2">
                  {opportunity.documents.map((doc, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium">{doc.name}</p>
                          <p className="text-sm text-gray-500">{doc.type}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        Visualizar
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum documento anexado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Métricas de Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taxa de Conversão:</span>
                  <span className="font-medium">12.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ticket Médio:</span>
                  <span className="font-medium">
                    {opportunity.investorCount > 0 
                      ? formatCurrency(opportunity.currentAmount / opportunity.investorCount)
                      : formatCurrency(0)
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tempo Médio de Decisão:</span>
                  <span className="font-medium">3.2 dias</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Alertas</CardTitle>
              </CardHeader>
              <CardContent>
                {progress < 50 && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium text-yellow-800">Captação Baixa</p>
                      <p className="text-sm text-yellow-600">
                        Apenas {formatPercentage(progress)} da meta atingida
                      </p>
                    </div>
                  </div>
                )}
                
                {new Date(opportunity.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-medium text-red-800">Prazo Próximo</p>
                      <p className="text-sm text-red-600">
                        Prazo expira em menos de 7 dias
                      </p>
                    </div>
                  </div>
                )}
                
                {progress >= 50 && new Date(opportunity.deadline) >= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Nenhum alerta no momento</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
