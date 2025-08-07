import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { isEmailTaken } from '@/lib/auth-helpers';

const checkEmailSchema = z.object({
  email: z.string().email('Email inválido'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = checkEmailSchema.parse(body);

    const emailExists = await isEmailTaken(email);

    return NextResponse.json({
      available: !emailExists,
      message: emailExists ? 'Email já está em uso' : 'Email disponível',
    });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Check email error:', error);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Email inválido' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
