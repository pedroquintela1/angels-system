'use client';

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MaintenanceStatus {
  isInMaintenance: boolean;
  message: string;
  estimatedCompletion: string;
  supportEmail: string;
}

export default function MaintenanceBanner() {
  const [maintenanceStatus, setMaintenanceStatus] =
    useState<MaintenanceStatus | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [lastChecked, setLastChecked] = useState<number>(0);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      const now = Date.now();
      const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

      // Verifica se já verificou recentemente
      if (now - lastChecked < CACHE_DURATION) {
        return;
      }

      try {
        const response = await fetch('/api/maintenance-status');
        if (response.ok) {
          const status = await response.json();
          setMaintenanceStatus(status);
          setLastChecked(now);

          // Armazena no localStorage para cache entre sessões
          localStorage.setItem(
            'maintenance-status',
            JSON.stringify({
              status,
              timestamp: now,
            })
          );
        }
      } catch (error) {
        console.error('Erro ao verificar status de manutenção:', error);
      }
    };

    // Verifica cache local primeiro
    const cachedStatus = localStorage.getItem('maintenance-status');
    if (cachedStatus) {
      try {
        const { status, timestamp } = JSON.parse(cachedStatus);
        const now = Date.now();
        const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

        if (now - timestamp < CACHE_DURATION) {
          setMaintenanceStatus(status);
          setLastChecked(timestamp);
          return;
        }
      } catch (error) {
        localStorage.removeItem('maintenance-status');
      }
    }

    // Faz a verificação inicial
    fetchMaintenanceStatus();

    // Configura verificação periódica a cada 5 minutos
    const interval = setInterval(fetchMaintenanceStatus, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [lastChecked]);

  if (!maintenanceStatus?.isInMaintenance || !isVisible) {
    return null;
  }

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between text-amber-800">
        <div className="flex-1">
          <strong>Manutenção Programada:</strong> {maintenanceStatus.message}
          {maintenanceStatus.estimatedCompletion && (
            <span className="ml-2">
              Previsão de conclusão: {maintenanceStatus.estimatedCompletion}
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="ml-2 text-amber-600 hover:text-amber-700"
        >
          <X className="h-4 w-4" />
        </Button>
      </AlertDescription>
    </Alert>
  );
}
