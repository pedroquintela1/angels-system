'use client';

import { useState, useEffect } from 'react';
import {
  Trophy,
  Calendar,
  Users,
  TrendingUp,
  ShoppingCart,
  Clock,
  Gift,
  Ticket,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { QuantitySelector } from '@/components/ui/quantity-selector';
import { useToast } from '@/hooks/use-toast';

// Types
interface Lottery {
  id: string;
  title: string;
  description: string;
  prize: string; // Campo de texto livre para nome do prêmio
  ticketPrice: number;
  totalNumbers: number;
  soldCount: number;
  availableCount: number;
  progress: number;
  drawDate: string;
  numbersDigits: number;
  allowMultiplePurchase: boolean;
}

interface PurchaseResult {
  success: boolean;
  ticketId: string;
  numbers: number[];
  totalPrice: number;
  message: string;
}

export default function LotteriesPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lotteries, setLotteries] = useState<Lottery[]>([]);
  const [selectedLottery, setSelectedLottery] = useState<Lottery | null>(null);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [purchasing, setPurchasing] = useState(false);

  // Load lotteries
  useEffect(() => {
    fetchLotteries();
  }, []);

  const fetchLotteries = async () => {
    try {
      const response = await fetch('/api/lotteries');
      if (response.ok) {
        const data = await response.json();
        setLotteries(data);
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao carregar rifas.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!selectedLottery) return;

    setPurchasing(true);
    try {
      const response = await fetch(
        `/api/lotteries/${selectedLottery.id}/purchase`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quantity }),
        }
      );

      if (response.ok) {
        const result: PurchaseResult = await response.json();
        toast({
          title: 'Sucesso!',
          description: result.message,
        });
        setIsPurchaseModalOpen(false);
        setQuantity(1);
        fetchLotteries(); // Atualizar lista
      } else {
        const error = await response.json();
        toast({
          title: 'Erro',
          description: error.error || 'Falha ao realizar compra.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Falha ao realizar compra.',
        variant: 'destructive',
      });
    } finally {
      setPurchasing(false);
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
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-blue-600" />
        <span className="font-bold text-blue-600 text-xl">{lottery.prize}</span>
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

  const openPurchaseModal = (lottery: Lottery) => {
    setSelectedLottery(lottery);
    setQuantity(1);
    setIsPurchaseModalOpen(true);
  };

  const getTimeRemaining = (drawDate: string) => {
    const now = new Date();
    const draw = new Date(drawDate);
    const diff = draw.getTime() - now.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days}d ${hours}h`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return 'Encerrando';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Rifas Disponíveis</h1>
          <p className="text-muted-foreground">
            Participe das rifas e concorra a prêmios incríveis!
          </p>
        </div>
      </div>

      {lotteries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Ticket className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">
              Nenhuma rifa disponível
            </h3>
            <p className="text-muted-foreground text-center">
              No momento não há rifas ativas. Volte em breve para não perder as
              próximas oportunidades!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {lotteries.map(lottery => (
            <Card
              key={lottery.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <CardTitle className="text-lg">{lottery.title}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {lottery.description}
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    <Clock className="h-3 w-3 mr-1" />
                    {getTimeRemaining(lottery.drawDate)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Prize and Ticket Price */}
                <div className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground mb-1">Prêmio</p>
                    {formatPrize(lottery)}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Por número</p>
                    <p className="text-lg font-semibold">
                      {formatCurrency(lottery.ticketPrice)}
                    </p>
                  </div>
                </div>

                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Números vendidos</span>
                    <span>
                      {lottery.soldCount}/{lottery.totalNumbers}
                    </span>
                  </div>
                  <Progress value={lottery.progress} className="h-2" />
                  <p className="text-xs text-muted-foreground">
                    {lottery.availableCount} números disponíveis
                  </p>
                </div>

                {/* Draw Date */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Sorteio: {formatDate(lottery.drawDate)}</span>
                </div>

                {/* Purchase Button */}
                <Button
                  onClick={() => openPurchaseModal(lottery)}
                  className="w-full"
                  disabled={lottery.availableCount === 0}
                >
                  {lottery.availableCount === 0 ? (
                    'Esgotado'
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Comprar Números
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Purchase Modal */}
      <Dialog open={isPurchaseModalOpen} onOpenChange={setIsPurchaseModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedLottery?.title}
            </DialogTitle>
            <DialogDescription className="text-base">
              Escolha a quantidade de números para sua participação
            </DialogDescription>
          </DialogHeader>
          {selectedLottery && (
            <div className="space-y-6">
              {/* Informações da rifa */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-lg text-white">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Prêmio</span>
                  <span className="text-lg font-bold">
                    {selectedLottery.prize}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Sorteio</span>
                  <span>{formatDate(selectedLottery.drawDate)}</span>
                </div>
              </div>

              {/* Seletor de quantidade */}
              <QuantitySelector
                ticketPrice={selectedLottery.ticketPrice}
                availableCount={selectedLottery.availableCount}
                totalNumbers={selectedLottery.totalNumbers}
                soldCount={selectedLottery.soldCount}
                allowMultiplePurchase={selectedLottery.allowMultiplePurchase}
                onQuantityChange={setQuantity}
                onPurchase={handlePurchase}
                purchasing={purchasing}
                className="min-h-[400px]"
              />
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPurchaseModalOpen(false)}
              disabled={purchasing}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
