'use client';

import { useState, useEffect } from 'react';
import {
  Gift,
  Trophy,
  Calendar,
  Users,
  Star,
  Clock,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause,
  BarChart3,
  DollarSign,
  Eye,
  Download,
  RefreshCw,
  Settings,
  Package,
  Target,
  Info,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { useToast } from '@/hooks/use-toast';

// Types
interface Lottery {
  id: string;
  title: string;
  description: string;
  prize: string; // Campo de texto livre para nome do prêmio
  ticketPrice: number;
  totalNumbers: number;
  drawDate: string;
  status: 'DRAFT' | 'ACTIVE' | 'DRAWING' | 'COMPLETED' | 'CANCELLED';
  drawType: 'PLATFORM' | 'FEDERAL_LOTTERY';
  federalLotteryDate?: string;
  winningNumber?: number;
  numbersDigits: number;
  allowMultiplePurchase: boolean;
  createdAt: string;
  updatedAt: string;
  ticketsSold: number;
  participants: number;
  revenue: number;
  numbersAvailable: number;
}

interface LotteryFormData {
  title: string;
  description: string;
  prize: string; // Campo de texto livre para nome do prêmio
  ticketPrice: string;
  totalNumbers: string;
  drawDate: string;
  numbersDigits: string;
  drawType: 'PLATFORM' | 'FEDERAL_LOTTERY';
  federalLotteryDate: string;
  allowMultiplePurchase: boolean;
}

interface LotteryStats {
  totalLotteries: number;
  activeLotteries: number;
  totalRevenue: number;
  totalPrizes: number;
  totalParticipants: number;
  avgTicketsPerLottery: number;
}

export default function AdminLotteriesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [stats, setStats] = useState<LotteryStats | null>(null);
  const [selectedLottery, setSelectedLottery] = useState<Lottery | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);
  const [drawWinningNumber, setDrawWinningNumber] = useState('');
  const [formData, setFormData] = useState<LotteryFormData>({
    title: '',
    description: '',
    prize: '', // Campo livre para nome do prêmio
    ticketPrice: '',
    totalNumbers: '1000', // Default to 1000 numbers
    drawDate: '',
    numbersDigits: '4', // Default to 4 digits (0001, 0002, etc.)
    drawType: 'PLATFORM',
    federalLotteryDate: '',
    allowMultiplePurchase: true,
  });

  // Load data
  useEffect(() => {
    fetchLotteries();
    fetchStats();
  }, []);

  const fetchLotteries = async () => {
    try {
      const response = await fetch('/api/admin/lotteries');
      if (response.ok) {
        const data = await response.json();
        setLotteries(data);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar sorteios.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/lotteries/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Form handlers
  const handleInputChange = (field: keyof LotteryFormData, value: string) => {
    if (field === 'totalNumbers') {
      const total = parseInt(value);
      if (!isNaN(total) && total > 0) {
        // Calcular automaticamente o número de dígitos
        const digits = Math.floor(Math.log10(total)) + 1;
        setFormData(prev => ({
          ...prev,
          [field]: value,
          numbersDigits: digits.toString(),
        }));
        return;
      }
    }
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      prize: '', // Campo livre para nome do prêmio
      ticketPrice: '',
      totalNumbers: '1000',
      drawDate: '',
      numbersDigits: '4',
      drawType: 'PLATFORM',
      federalLotteryDate: '',
      allowMultiplePurchase: true,
    });
  };

  const handleCreateLottery = async () => {
    try {
      // Client-side validation
      const requiredFields = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        prize: formData.prize.trim(),
        ticketPrice: formData.ticketPrice.trim(),
        drawDate: formData.drawDate.trim(),
      };

      const emptyFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([field, _]) => field);

      if (emptyFields.length > 0) {
        toast({
          title: 'Erro de Validação',
          description: `Os seguintes campos são obrigatórios: ${emptyFields.join(', ')}`,
          variant: 'destructive',
        });
        return;
      }

      // Additional validation for numeric fields
      const ticketPrice = parseFloat(formData.ticketPrice);
      const totalNumbers = parseInt(formData.totalNumbers);

      if (isNaN(ticketPrice) || ticketPrice <= 0) {
        toast({
          title: 'Erro de Validação',
          description:
            'O preço do bilhete deve ser um número válido maior que zero',
          variant: 'destructive',
        });
        return;
      }

      if (isNaN(totalNumbers) || totalNumbers <= 0) {
        toast({
          title: 'Erro de Validação',
          description:
            'O total de números deve ser um número válido maior que zero',
          variant: 'destructive',
        });
        return;
      }

      const requestBody = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        prize: formData.prize.trim(),
        ticketPrice,
        totalNumbers,
        drawDate: formData.drawDate,
        drawType: formData.drawType,
        federalLotteryDate: formData.federalLotteryDate || undefined,
        allowMultiplePurchase: formData.allowMultiplePurchase,
      };

      console.log('Creating lottery with data:', requestBody);

      const response = await fetch('/api/admin/lotteries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const responseData = await response.json();

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Sorteio criado com sucesso.',
        });
        setIsCreateModalOpen(false);
        resetForm();
        fetchLotteries();
        fetchStats();
      } else {
        throw new Error(responseData.error || 'Falha ao criar sorteio');
      }
    } catch (error) {
      console.error('Error creating lottery:', error);
      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Falha ao criar sorteio.',
        variant: 'destructive',
      });
    }
  };

  const handleEditLottery = async () => {
    if (!selectedLottery) return;

    try {
      const response = await fetch(
        `/api/admin/lotteries/${selectedLottery.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            prize: formData.prize, // Campo de texto simples
            ticketPrice: parseFloat(formData.ticketPrice),
            totalNumbers: parseInt(formData.totalNumbers),
            drawDate: formData.drawDate,
            drawType: formData.drawType,
            federalLotteryDate: formData.federalLotteryDate || undefined,
            allowMultiplePurchase: formData.allowMultiplePurchase,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Sorteio atualizado com sucesso.',
        });
        setIsEditModalOpen(false);
        setSelectedLottery(null);
        resetForm();
        fetchLotteries();
        fetchStats();
      } else {
        throw new Error('Falha ao atualizar sorteio');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar sorteio.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteLottery = async (lotteryId: string) => {
    try {
      const response = await fetch(`/api/admin/lotteries/${lotteryId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Sorteio excluído com sucesso.',
        });
        fetchLotteries();
        fetchStats();
      } else {
        throw new Error('Falha ao excluir sorteio');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao excluir sorteio.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (lotteryId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/lotteries/${lotteryId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: 'Sucesso',
          description: 'Status do sorteio atualizado.',
        });
        fetchLotteries();
        fetchStats();
      } else {
        throw new Error('Falha ao atualizar status');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao atualizar status do sorteio.',
        variant: 'destructive',
      });
    }
  };

  const handleDrawLottery = async (lottery: Lottery) => {
    if (lottery.drawType === 'FEDERAL_LOTTERY') {
      // Para Loteria Federal, abrir modal para inserir número
      setSelectedLottery(lottery);
      setDrawWinningNumber('');
      setIsDrawModalOpen(true);
    } else {
      // Para sorteio da plataforma, realizar automaticamente
      await performDraw(lottery.id);
    }
  };

  const performDraw = async (lotteryId: string, winningNumber?: number) => {
    try {
      const body = winningNumber ? { winningNumber } : {};

      const response = await fetch(`/api/admin/lotteries/${lotteryId}/draw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: 'Sucesso',
          description: `Sorteio realizado! Número vencedor: ${result.winningNumber}`,
        });
        setIsDrawModalOpen(false);
        setSelectedLottery(null);
        setDrawWinningNumber('');
        fetchLotteries();
        fetchStats();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Falha ao realizar sorteio');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description:
          error instanceof Error ? error.message : 'Falha ao realizar sorteio.',
        variant: 'destructive',
      });
    }
  };

  // Utility functions
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPrize = (lottery: Lottery) => {
    return (
      <div className="flex items-center gap-1">
        <Trophy className="h-4 w-4 text-yellow-600" />
        <span className="font-medium">{lottery.prize}</span>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { label: 'Rascunho', variant: 'secondary' as const },
      ACTIVE: { label: 'Ativo', variant: 'default' as const },
      DRAWING: { label: 'Sorteando', variant: 'destructive' as const },
      COMPLETED: { label: 'Concluído', variant: 'outline' as const },
      CANCELLED: { label: 'Cancelado', variant: 'destructive' as const },
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const openEditModal = (lottery: Lottery) => {
    setSelectedLottery(lottery);

    setFormData({
      title: lottery.title,
      description: lottery.description,
      prize: lottery.prize, // Agora é um campo de texto simples
      ticketPrice: lottery.ticketPrice.toString(),
      totalNumbers: lottery.totalNumbers.toString(),
      drawDate: new Date(lottery.drawDate).toISOString().slice(0, 16),
      numbersDigits: lottery.numbersDigits.toString(),
      drawType: lottery.drawType || 'PLATFORM',
      federalLotteryDate: lottery.federalLotteryDate
        ? new Date(lottery.federalLotteryDate).toISOString().slice(0, 16)
        : '',
      allowMultiplePurchase: lottery.allowMultiplePurchase,
    });
    setIsEditModalOpen(true);
  };

  const openDetailsModal = (lottery: Lottery) => {
    setSelectedLottery(lottery);
    setIsDetailsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerenciar Rifas</h1>
          <p className="text-muted-foreground">
            Gerencie rifas, visualize estatísticas e realize sorteios
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Rifa
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total de Sorteios
              </CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalLotteries}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeLotteries} ativos
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Receita Total
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalRevenue)}
              </div>
              <p className="text-xs text-muted-foreground">
                {formatCurrency(stats.totalPrizes)} em prêmios
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Participantes
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalParticipants}
              </div>
              <p className="text-xs text-muted-foreground">
                ~{stats.avgTicketsPerLottery.toFixed(1)} tickets/sorteio
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Lotteries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Sorteios</CardTitle>
          <CardDescription>
            Lista de todos os sorteios da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Prêmio</TableHead>
                <TableHead>Data do Sorteio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Vendidos/Total</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotteries.map(lottery => (
                <TableRow key={lottery.id}>
                  <TableCell className="font-medium">{lottery.title}</TableCell>
                  <TableCell>{formatPrize(lottery)}</TableCell>
                  <TableCell>{formatDate(lottery.drawDate)}</TableCell>
                  <TableCell>{getStatusBadge(lottery.status)}</TableCell>
                  <TableCell>
                    {lottery.ticketsSold}/{lottery.totalNumbers}
                  </TableCell>
                  <TableCell>{formatCurrency(lottery.revenue)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openDetailsModal(lottery)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditModal(lottery)}
                        disabled={lottery.status === 'COMPLETED'}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {lottery.status === 'DRAFT' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleStatusChange(lottery.id, 'ACTIVE')
                          }
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {lottery.status === 'ACTIVE' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDrawLottery(lottery)}
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={lottery.status === 'COMPLETED'}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Confirmar exclusão
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. Tem certeza que
                              deseja excluir este sorteio?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteLottery(lottery.id)}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Lottery Modal */}
      <Dialog
        open={isCreateModalOpen || isEditModalOpen}
        onOpenChange={open => {
          if (!open) {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedLottery(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCreateModalOpen ? 'Nova Rifa' : 'Editar Rifa'}
            </DialogTitle>
            <DialogDescription>
              {isCreateModalOpen
                ? 'Crie uma nova rifa para a plataforma'
                : 'Edite as informações da rifa'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => handleInputChange('title', e.target.value)}
                  placeholder="Mega Sorteio de Janeiro"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ticketPrice">Preço do Bilhete (R$)</Label>
                <Input
                  id="ticketPrice"
                  type="number"
                  step="0.01"
                  value={formData.ticketPrice}
                  onChange={e =>
                    handleInputChange('ticketPrice', e.target.value)
                  }
                  placeholder="5.00"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e => handleInputChange('description', e.target.value)}
                placeholder="Descrição do sorteio..."
                rows={3}
              />
            </div>

            {/* Seção do Prêmio Simplificada */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
              <h4 className="font-medium text-green-900 flex items-center gap-2">
                <Trophy className="h-4 w-4" />
                Prêmio
              </h4>

              <div className="grid gap-2">
                <Label htmlFor="prize">Nome do Prêmio</Label>
                <Input
                  id="prize"
                  value={formData.prize}
                  onChange={e => handleInputChange('prize', e.target.value)}
                  placeholder="ex: R$ 10.000 em dinheiro, iPhone 15 Pro Max, Carro HB20 2024..."
                />
                <p className="text-xs text-gray-500">
                  Digite o nome/descrição completa do prêmio (pode ser dinheiro
                  ou item físico)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="totalNumbers">Total de Números</Label>
                <Input
                  id="totalNumbers"
                  type="number"
                  min="1"
                  max="10000000"
                  value={formData.totalNumbers}
                  onChange={e =>
                    handleInputChange('totalNumbers', e.target.value)
                  }
                  placeholder="1000"
                />
                <p className="text-xs text-gray-500">
                  Máximo: 10.000.000 números. Dígitos calculados
                  automaticamente.
                </p>
              </div>
              <div className="grid gap-2">
                <Label>Tipo de Sorteio</Label>
                <Select
                  value={formData.drawType}
                  onValueChange={(value: 'PLATFORM' | 'FEDERAL_LOTTERY') =>
                    handleInputChange('drawType', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLATFORM">
                      <div className="flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Sorteio pela Plataforma
                      </div>
                    </SelectItem>
                    <SelectItem value="FEDERAL_LOTTERY">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        Loteria Federal
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  {formData.drawType === 'PLATFORM'
                    ? 'Sorteio automático pela nossa plataforma'
                    : 'Baseado no resultado da Loteria Federal'}
                </p>
              </div>
            </div>

            {/* Campos condicionais para Loteria Federal */}
            {formData.drawType === 'FEDERAL_LOTTERY' && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="federalLotteryDate">Data da Extração</Label>
                    <Input
                      id="federalLotteryDate"
                      type="datetime-local"
                      value={formData.federalLotteryDate}
                      onChange={e =>
                        handleInputChange('federalLotteryDate', e.target.value)
                      }
                    />
                    <p className="text-xs text-amber-700">
                      Data oficial da extração da Loteria Federal
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="drawDate">Data do Sorteio</Label>
                <Input
                  id="drawDate"
                  type="datetime-local"
                  value={formData.drawDate}
                  onChange={e => handleInputChange('drawDate', e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  {formData.drawType === 'PLATFORM'
                    ? 'Quando o sorteio será realizado'
                    : 'Data limite para participação'}
                </p>
              </div>
              <div className="flex items-center space-x-2 mt-8">
                <Checkbox
                  id="allowMultiplePurchase"
                  checked={formData.allowMultiplePurchase}
                  onCheckedChange={checked =>
                    setFormData(prev => ({
                      ...prev,
                      allowMultiplePurchase: checked === true,
                    }))
                  }
                />
                <Label htmlFor="allowMultiplePurchase">
                  Permitir múltiplas compras
                </Label>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Informações calculadas:</p>
                  <ul className="space-y-1 text-xs">
                    <li>
                      • Números gerados: de{' '}
                      {String(1).padStart(
                        parseInt(formData.numbersDigits) || 4,
                        '0'
                      )}{' '}
                      até {formData.totalNumbers}
                    </li>
                    <li>
                      • Dígitos: {formData.numbersDigits} (calculado
                      automaticamente)
                    </li>
                    <li>
                      • Receita máxima:{' '}
                      {formatCurrency(
                        parseInt(formData.totalNumbers || '0') *
                          parseFloat(formData.ticketPrice || '0')
                      )}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedLottery(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={
                isCreateModalOpen ? handleCreateLottery : handleEditLottery
              }
            >
              {isCreateModalOpen ? 'Criar Rifa' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Draw Modal for Federal Lottery */}
      <Dialog open={isDrawModalOpen} onOpenChange={setIsDrawModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Realizar Sorteio - Loteria Federal</DialogTitle>
            <DialogDescription>
              Insira o número vencedor baseado na Loteria Federal
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="winningNumber">Número Vencedor</Label>
              <Input
                id="winningNumber"
                type="number"
                value={drawWinningNumber}
                onChange={e => setDrawWinningNumber(e.target.value)}
                placeholder="Digite o número vencedor"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDrawModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() =>
                performDraw(
                  selectedLottery?.id || '',
                  parseInt(drawWinningNumber)
                )
              }
              disabled={!drawWinningNumber}
            >
              Confirmar Sorteio
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Modal */}
      <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Rifa</DialogTitle>
            <DialogDescription>
              Informações completas sobre a rifa
            </DialogDescription>
          </DialogHeader>
          {selectedLottery && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Título</Label>
                  <p className="text-sm">{selectedLottery.title}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    {getStatusBadge(selectedLottery.status)}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Descrição</Label>
                <p className="text-sm text-gray-600">
                  {selectedLottery.description}
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">Prêmio</Label>
                  <div className="mt-1">{formatPrize(selectedLottery)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Preço por número
                  </Label>
                  <p className="text-lg font-semibold">
                    {formatCurrency(selectedLottery.ticketPrice)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">
                    Total de números
                  </Label>
                  <p className="text-lg font-semibold">
                    {selectedLottery.totalNumbers}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium">
                    Números vendidos
                  </Label>
                  <p className="text-lg font-semibold text-green-600">
                    {selectedLottery.ticketsSold}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Participantes</Label>
                  <p className="text-lg font-semibold text-blue-600">
                    {selectedLottery.participants}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Receita total</Label>
                  <p className="text-lg font-semibold text-purple-600">
                    {formatCurrency(selectedLottery.revenue)}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Data do sorteio</Label>
                  <p className="text-sm">
                    {formatDate(selectedLottery.drawDate)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tipo de sorteio</Label>
                  <p className="text-sm">
                    {selectedLottery.drawType === 'PLATFORM'
                      ? 'Plataforma'
                      : 'Loteria Federal'}
                  </p>
                </div>
              </div>
              {selectedLottery.winningNumber && (
                <div>
                  <Label className="text-sm font-medium">Número vencedor</Label>
                  <p className="text-2xl font-bold text-green-600">
                    {String(selectedLottery.winningNumber).padStart(
                      selectedLottery.numbersDigits,
                      '0'
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsDetailsModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
