'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface OpportunityForm {
  title: string;
  description: string;
  targetAmount: string;
  minInvestment: string;
  expectedReturn: string;
  deadline: string;
  category: string;
  riskLevel: string;
  documents: File[];
}

export default function NewOpportunityPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<OpportunityForm>({
    title: '',
    description: '',
    targetAmount: '',
    minInvestment: '',
    expectedReturn: '',
    deadline: '',
    category: '',
    riskLevel: '',
    documents: [],
  });

  const handleInputChange = (field: keyof OpportunityForm, value: string) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setForm(prev => ({
        ...prev,
        documents: Array.from(e.target.files || []),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title || !form.description || !form.targetAmount || !form.minInvestment || 
        !form.expectedReturn || !form.deadline || !form.category || !form.riskLevel) {
      toast({
        title: 'Erro',
        description: 'Todos os campos obrigatórios devem ser preenchidos',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('targetAmount', form.targetAmount);
      formData.append('minInvestment', form.minInvestment);
      formData.append('expectedReturn', form.expectedReturn);
      formData.append('deadline', form.deadline);
      formData.append('category', form.category);
      formData.append('riskLevel', form.riskLevel);

      // Add documents
      form.documents.forEach((file, index) => {
        formData.append(`documents`, file);
      });

      const response = await fetch('/api/admin/opportunities', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Sucesso',
          description: 'Oportunidade criada com sucesso',
        });
        router.push(`/admin/opportunities/${data.opportunity.id}`);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar oportunidade');
      }
    } catch (error) {
      console.error('Error creating opportunity:', error);
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao criar oportunidade',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, '');
    const formattedValue = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(Number(numericValue) / 100);
    return formattedValue;
  };

  const handleCurrencyChange = (field: keyof OpportunityForm, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    setForm(prev => ({
      ...prev,
      [field]: numericValue,
    }));
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Nova Oportunidade</h1>
            <p className="text-gray-600">Criar nova oportunidade de investimento</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Básicas</CardTitle>
            <CardDescription>
              Informações gerais sobre a oportunidade de investimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  placeholder="Nome da oportunidade"
                  value={form.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Categoria *</Label>
                <Select value={form.category} onValueChange={(value) => handleInputChange('category', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="real_estate">Imóveis</SelectItem>
                    <SelectItem value="technology">Tecnologia</SelectItem>
                    <SelectItem value="retail">Varejo</SelectItem>
                    <SelectItem value="services">Serviços</SelectItem>
                    <SelectItem value="agriculture">Agronegócio</SelectItem>
                    <SelectItem value="energy">Energia</SelectItem>
                    <SelectItem value="healthcare">Saúde</SelectItem>
                    <SelectItem value="education">Educação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                placeholder="Descreva detalhadamente a oportunidade de investimento..."
                value={form.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={6}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Financeiras</CardTitle>
            <CardDescription>
              Valores e retornos esperados da oportunidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetAmount">Meta de Captação *</Label>
                <Input
                  id="targetAmount"
                  placeholder="R$ 0,00"
                  value={form.targetAmount ? formatCurrency(form.targetAmount) : ''}
                  onChange={(e) => handleCurrencyChange('targetAmount', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="minInvestment">Investimento Mínimo *</Label>
                <Input
                  id="minInvestment"
                  placeholder="R$ 0,00"
                  value={form.minInvestment ? formatCurrency(form.minInvestment) : ''}
                  onChange={(e) => handleCurrencyChange('minInvestment', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedReturn">Retorno Esperado (%) *</Label>
                <Input
                  id="expectedReturn"
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={form.expectedReturn}
                  onChange={(e) => handleInputChange('expectedReturn', e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Risk and Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Risco e Prazo</CardTitle>
            <CardDescription>
              Classificação de risco e prazo da oportunidade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="riskLevel">Nível de Risco *</Label>
                <Select value={form.riskLevel} onValueChange={(value) => handleInputChange('riskLevel', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o nível de risco" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixo</SelectItem>
                    <SelectItem value="medium">Médio</SelectItem>
                    <SelectItem value="high">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">Prazo Final *</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={form.deadline}
                  onChange={(e) => handleInputChange('deadline', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
            <CardDescription>
              Anexe documentos relacionados à oportunidade (opcional)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="documents">Documentos</Label>
              <Input
                id="documents"
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
              />
              <p className="text-sm text-gray-500">
                Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. 10MB cada)
              </p>
            </div>

            {form.documents.length > 0 && (
              <div className="space-y-2">
                <Label>Arquivos Selecionados:</Label>
                <div className="space-y-1">
                  {form.documents.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <Upload className="h-4 w-4" />
                      <span>{file.name}</span>
                      <span className="text-gray-400">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/admin/opportunities">
            <Button variant="outline" type="button">
              Cancelar
            </Button>
          </Link>
          
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Criando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Criar Oportunidade
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
