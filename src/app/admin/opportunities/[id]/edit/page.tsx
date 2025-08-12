'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save, X } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface Opportunity {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  minInvestment: number;
  maxInvestment: number;
  startDate: string;
  endDate: string;
  expectedReturn?: number;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'COMPLETED' | 'CANCELLED';
}

export default function EditOpportunityPage() {
  const params = useParams();
  const router = useRouter();
  const opportunityId = params.id as string;

  const [opportunity, setOpportunity] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetAmount: 0,
    minInvestment: 0,
    maxInvestment: 0,
    startDate: '',
    endDate: '',
    expectedReturn: 0,
    expectedSaleValue: 0,
  });

  // Estados para controlar o modo de cálculo
  const [returnCalculationMode, setReturnCalculationMode] = useState<
    'percentage' | 'saleValue'
  >('percentage');

  // Carregar dados da oportunidade
  useEffect(() => {
    const loadOpportunity = async () => {
      try {
        const response = await fetch(
          `/api/admin/opportunities/${opportunityId}`
        );
        if (!response.ok) {
          throw new Error('Erro ao carregar oportunidade');
        }
        const data = await response.json();
        setOpportunity(data.opportunity);

        // Preencher formulário com dados existentes
        setFormData({
          title: data.opportunity.title,
          description: data.opportunity.description,
          targetAmount: data.opportunity.targetAmount,
          minInvestment: data.opportunity.minInvestment,
          maxInvestment: data.opportunity.maxInvestment,
          startDate: data.opportunity.startDate
            ? new Date(data.opportunity.startDate).toISOString().slice(0, 16)
            : '',
          endDate: data.opportunity.endDate
            ? new Date(data.opportunity.endDate).toISOString().slice(0, 16)
            : '',
          expectedReturn: data.opportunity.expectedReturn || 0,
          expectedSaleValue: 0, // Será calculado baseado no expectedReturn
        });

        // Se já tem expectedReturn, calcular o expectedSaleValue
        if (data.opportunity.expectedReturn && data.opportunity.targetAmount) {
          const calculatedSaleValue =
            data.opportunity.targetAmount *
            (1 + data.opportunity.expectedReturn / 100);
          setFormData(prev => ({
            ...prev,
            expectedSaleValue: calculatedSaleValue,
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar oportunidade:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os dados da oportunidade',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    if (opportunityId) {
      loadOpportunity();
    }
  }, [opportunityId]);

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Função para calcular % baseado no valor de venda
  const calculatePercentageFromSaleValue = (
    saleValue: number,
    targetAmount: number
  ) => {
    if (targetAmount === 0) return 0;
    return ((saleValue - targetAmount) / targetAmount) * 100;
  };

  // Função para calcular valor de venda baseado na %
  const calculateSaleValueFromPercentage = (
    percentage: number,
    targetAmount: number
  ) => {
    return targetAmount * (1 + percentage / 100);
  };

  // Handler especial para mudanças no retorno esperado
  const handleExpectedReturnChange = (value: number) => {
    setFormData(prev => {
      const newFormData = { ...prev, expectedReturn: value };
      // Se está no modo percentual, calcular o valor de venda
      if (returnCalculationMode === 'percentage') {
        newFormData.expectedSaleValue = calculateSaleValueFromPercentage(
          value,
          prev.targetAmount
        );
      }
      return newFormData;
    });
  };

  // Handler especial para mudanças no valor de venda esperado
  const handleExpectedSaleValueChange = (value: number) => {
    setFormData(prev => {
      const newFormData = { ...prev, expectedSaleValue: value };
      // Se está no modo valor de venda, calcular a %
      if (returnCalculationMode === 'saleValue') {
        newFormData.expectedReturn = calculatePercentageFromSaleValue(
          value,
          prev.targetAmount
        );
      }
      return newFormData;
    });
  };

  // Handler para mudança no valor alvo (recalcular tudo)
  const handleTargetAmountChange = (value: number) => {
    setFormData(prev => {
      const newFormData = { ...prev, targetAmount: value };

      if (returnCalculationMode === 'percentage') {
        // Recalcular valor de venda baseado na % atual
        newFormData.expectedSaleValue = calculateSaleValueFromPercentage(
          prev.expectedReturn,
          value
        );
      } else {
        // Recalcular % baseado no valor de venda atual
        newFormData.expectedReturn = calculatePercentageFromSaleValue(
          prev.expectedSaleValue,
          value
        );
      }

      return newFormData;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const requestBody = {
        title: formData.title,
        description: formData.description,
        targetAmount: Number(formData.targetAmount),
        minInvestment: Number(formData.minInvestment),
        maxInvestment: Number(formData.maxInvestment),
        expectedReturn: Number(formData.expectedReturn),
        startDate: formData.startDate
          ? new Date(formData.startDate).toISOString()
          : null,
        endDate: formData.endDate
          ? new Date(formData.endDate).toISOString()
          : null,
      };

      console.log('🚀 Enviando dados:', requestBody);

      const response = await fetch(
        `/api/admin/opportunities/${opportunityId}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        throw new Error('Erro ao salvar oportunidade');
      }

      toast({
        title: 'Sucesso',
        description: 'Oportunidade atualizada com sucesso',
      });

      router.push(`/admin/opportunities/${opportunityId}`);
    } catch (error) {
      console.error('Erro ao salvar oportunidade:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!opportunity) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Oportunidade não encontrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href={`/admin/opportunities/${opportunityId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Editar Oportunidade</h1>
            <p className="text-gray-600">{opportunity.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/admin/opportunities/${opportunityId}`}>
            <Button variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      {/* Formulário de Edição */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informações Básicas */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>
                Edite as informações principais da oportunidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => handleInputChange('title', e.target.value)}
                  placeholder="Nome da oportunidade"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e =>
                    handleInputChange('description', e.target.value)
                  }
                  placeholder="Descrição detalhada da oportunidade"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="targetAmount">Valor Alvo (R$) *</Label>
                  <Input
                    id="targetAmount"
                    type="number"
                    value={formData.targetAmount}
                    onChange={e =>
                      handleTargetAmountChange(Number(e.target.value))
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <Label htmlFor="minInvestment">
                    Investimento Mínimo (R$) *
                  </Label>
                  <Input
                    id="minInvestment"
                    type="number"
                    value={formData.minInvestment}
                    onChange={e =>
                      handleInputChange('minInvestment', Number(e.target.value))
                    }
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="maxInvestment">Investimento Máximo (R$)</Label>
                <Input
                  id="maxInvestment"
                  type="number"
                  value={formData.maxInvestment}
                  onChange={e =>
                    handleInputChange('maxInvestment', Number(e.target.value))
                  }
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor="expectedReturn">Retorno Esperado</Label>

                {/* Seletor de modo de cálculo */}
                <div className="flex gap-2 mb-3">
                  <Button
                    type="button"
                    variant={
                      returnCalculationMode === 'percentage'
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => setReturnCalculationMode('percentage')}
                  >
                    Inserir %
                  </Button>
                  <Button
                    type="button"
                    variant={
                      returnCalculationMode === 'saleValue'
                        ? 'default'
                        : 'outline'
                    }
                    size="sm"
                    onClick={() => setReturnCalculationMode('saleValue')}
                  >
                    Valor de Venda
                  </Button>
                </div>

                {/* Campo baseado no modo selecionado */}
                {returnCalculationMode === 'percentage' ? (
                  <div>
                    <Input
                      id="expectedReturn"
                      type="number"
                      value={formData.expectedReturn}
                      onChange={e =>
                        handleExpectedReturnChange(Number(e.target.value))
                      }
                      placeholder="0.0"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Percentual de retorno esperado:{' '}
                      <strong>{formData.expectedReturn.toFixed(1)}%</strong>
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Valor de venda calculado:{' '}
                      <strong>
                        R${' '}
                        {formData.expectedSaleValue.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </strong>
                    </p>
                  </div>
                ) : (
                  <div>
                    <Input
                      id="expectedSaleValue"
                      type="number"
                      value={formData.expectedSaleValue}
                      onChange={e =>
                        handleExpectedSaleValueChange(Number(e.target.value))
                      }
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Valor esperado de venda da oportunidade
                    </p>
                    <p className="text-sm text-blue-600 mt-1">
                      Retorno calculado:{' '}
                      <strong>{formData.expectedReturn.toFixed(2)}%</strong>
                    </p>
                    {formData.targetAmount > 0 && (
                      <p className="text-sm text-green-600 mt-1">
                        Lucro esperado:{' '}
                        <strong>
                          R${' '}
                          {(
                            formData.expectedSaleValue - formData.targetAmount
                          ).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </strong>
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de Início</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={e =>
                      handleInputChange('startDate', e.target.value)
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="endDate">Data de Fim</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={e => handleInputChange('endDate', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status e Informações Adicionais */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Status</CardTitle>
              <CardDescription>
                Informações sobre o status atual
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status Atual</Label>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      opportunity.status === 'DRAFT'
                        ? 'bg-gray-100 text-gray-800'
                        : opportunity.status === 'ACTIVE'
                          ? 'bg-green-100 text-green-800'
                          : opportunity.status === 'CLOSED'
                            ? 'bg-orange-100 text-orange-800'
                            : opportunity.status === 'COMPLETED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {opportunity.status === 'DRAFT'
                      ? 'Rascunho'
                      : opportunity.status === 'ACTIVE'
                        ? 'Ativa'
                        : opportunity.status === 'CLOSED'
                          ? 'Fechada'
                          : opportunity.status === 'COMPLETED'
                            ? 'Concluída'
                            : 'Cancelada'}
                  </span>
                </div>
              </div>

              <div>
                <Label>Valor Captado</Label>
                <p className="text-2xl font-bold text-green-600">
                  R${' '}
                  {opportunity.currentAmount.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>

              <div>
                <Label>Progresso</Label>
                <div className="mt-2">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>
                      R$ {opportunity.currentAmount.toLocaleString('pt-BR')}
                    </span>
                    <span>
                      R$ {opportunity.targetAmount.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{
                        width: `${Math.min((opportunity.currentAmount / opportunity.targetAmount) * 100, 100)}%`,
                      }}
                    ></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {(
                      (opportunity.currentAmount / opportunity.targetAmount) *
                      100
                    ).toFixed(1)}
                    % do objetivo
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
