import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    console.log('Maintenance API called');

    const session = await getServerSession(authOptions);
    console.log('Session:', session?.user?.email, session?.user?.role);

    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin permissions
    // @ts-ignore - session type extension
    const userRole = session.user.role;
    console.log('User role:', userRole);

    if (userRole !== 'ADMIN') {
      console.log('Insufficient permissions for role:', userRole);
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { enabled, message, estimatedCompletion } = body;
    console.log('Maintenance data:', { enabled, message, estimatedCompletion });

  // Persistence/remoting disabled: previously used a shared in-memory state.
  // Leaving this endpoint as a no-op that validates permissions and echoes intent.
  console.log('Maintenance mode update request received (no-op):', {
      enabled,
      message,
      estimatedCompletion,
    });

    return NextResponse.json({
      success: true,
      message: enabled
        ? 'Modo de manutenção ativado'
        : 'Modo de manutenção desativado',
    });
  } catch (error) {
    console.error('Error updating maintenance mode:', error);
    return NextResponse.json(
      {
        error: 'Failed to update maintenance mode',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
