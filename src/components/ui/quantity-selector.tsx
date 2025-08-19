'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Minus, Plus } from 'lucide-react';

interface QuantitySelectorProps {
  ticketPrice: number;
  availableCount: number;
  totalNumbers: number;
  soldCount: number;
  allowMultiplePurchase: boolean;
  onQuantityChange: (quantity: number) => void;
  onPurchase?: () => void;
  purchasing?: boolean;
  className?: string;
}

export function QuantitySelector({
  ticketPrice,
  availableCount,
  totalNumbers,
  soldCount,
  allowMultiplePurchase,
  onQuantityChange,
  onPurchase,
  purchasing = false,
  className,
}: QuantitySelectorProps) {
  const [quantity, setQuantity] = useState(1);

  // Opções de seleção rápida baseadas na disponibilidade
  const quickOptions = [
    { label: '100 Títulos', value: 100 },
    { label: '250 Títulos', value: 250, popular: true },
    { label: '1000 Títulos', value: 1000 },
    { label: '1500 Títulos', value: 1500 },
  ].filter(option => option.value <= availableCount);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleQuantityUpdate = (newQuantity: number) => {
    if (newQuantity >= 1 && newQuantity <= availableCount) {
      setQuantity(newQuantity);
      onQuantityChange(newQuantity);
    }
  };

  const handleQuickSelect = (value: number) => {
    handleQuantityUpdate(value);
  };

  if (!allowMultiplePurchase) {
    return (
      <div className={`space-y-4 ${className}`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Quantidade</h3>
          <p className="text-sm text-muted-foreground">
            Esta rifa permite apenas 1 número por compra
          </p>
          <div className="mt-4 p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(ticketPrice)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Título da seção */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Compra Automática
        </h3>
        <p className="text-gray-600 text-sm">
          O site escolhe títulos aleatórios para você.
        </p>
      </div>

      {/* Opções de seleção rápida */}
      <div className="grid grid-cols-2 gap-3">
        {quickOptions.map(option => (
          <div key={option.value} className="relative">
            {option.popular && (
              <Badge className="absolute -top-2 -right-2 z-10 bg-green-500 text-white">
                Mais popular
              </Badge>
            )}
            <Button
              variant="outline"
              className={`w-full h-16 text-lg font-semibold border-2 ${
                quantity === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-300 bg-white hover:border-blue-300 hover:bg-blue-50'
              }`}
              onClick={() => handleQuickSelect(option.value)}
            >
              {option.label}
              <div className="text-xs text-gray-500 mt-1">Selecionar</div>
            </Button>
          </div>
        ))}
      </div>

      {/* Controles personalizados */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleQuantityUpdate(quantity - 1)}
            disabled={quantity <= 1}
            className="h-10 w-10"
          >
            <Minus className="h-4 w-4" />
          </Button>

          <div className="flex-1 max-w-24">
            <Input
              type="number"
              min={1}
              max={availableCount}
              value={quantity}
              onChange={e => {
                const value = parseInt(e.target.value) || 1;
                handleQuantityUpdate(value);
              }}
              className="text-center text-lg font-semibold"
            />
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => handleQuantityUpdate(quantity + 1)}
            disabled={quantity >= availableCount}
            className="h-10 w-10"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="text-center text-sm text-gray-600">
          {quantity} × {formatCurrency(ticketPrice)}
        </div>
      </div>

      {/* Total e botão de compra */}
      <div className="space-y-4">
        <Button
          className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white"
          onClick={onPurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Processando...
            </>
          ) : (
            <>
              COMPRAR
              <div className="ml-auto text-xl">
                {formatCurrency(ticketPrice * quantity)}
              </div>
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full h-12 text-orange-600 border-orange-300 hover:bg-orange-50"
        >
          VER MEUS NÚMEROS
        </Button>
      </div>

      {/* Barra de progresso */}
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-700 font-medium">Progresso de vendas</span>
          <span className="text-blue-600 font-semibold">
            {Math.round((soldCount / totalNumbers) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-400 to-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.round((soldCount / totalNumbers) * 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
