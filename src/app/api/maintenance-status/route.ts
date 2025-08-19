import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Por padrão, retorna que não está em manutenção
    // Este endpoint pode ser configurado para ativar/desativar manutenção
    const maintenanceStatus = {
      isInMaintenance: false,
      message: 'Sistema em manutenção. Voltamos em breve.',
      estimatedCompletion: '',
      supportEmail: 'suporte@angelsystem.com',
    };

    console.log('Maintenance status check:', maintenanceStatus);

    return NextResponse.json(maintenanceStatus);
  } catch (error) {
    console.error('Erro ao verificar status de manutenção:', error);
    return NextResponse.json(
      {
        isInMaintenance: false,
        message: 'Erro ao verificar status',
        estimatedCompletion: '',
        supportEmail: 'suporte@angelsystem.com',
      },
      { status: 500 }
    );
  }
}
