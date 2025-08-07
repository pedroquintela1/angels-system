import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';
import { generateRandomString, validateCPF } from '@/lib/utils';

// Validation schema for user registration
const registerSchema = z.object({
  firstName: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lastName: z.string().min(2, 'Sobrenome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone inválido'),
  cpf: z.string().refine(validateCPF, 'CPF inválido'),
  birthDate: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input data
    const validatedData = registerSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: validatedData.email },
          { cpf: validatedData.cpf.replace(/\D/g, '') },
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Usuário já existe com este email ou CPF' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(validatedData.password, 12);

    // Generate unique referral code
    let referralCode: string;
    let isUnique = false;
    
    do {
      referralCode = generateRandomString(8).toUpperCase();
      const existingCode = await prisma.user.findUnique({
        where: { referralCode },
      });
      isUnique = !existingCode;
    } while (!isUnique);

    // Create user
    const user = await prisma.user.create({
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        password: hashedPassword,
        phone: validatedData.phone,
        cpf: validatedData.cpf.replace(/\D/g, ''),
        birthDate: validatedData.birthDate ? new Date(validatedData.birthDate) : new Date(),
        referralCode,
        role: 'USER',
        kycStatus: 'PENDING',
        isActive: true,
      },
    });

    // Create membership record
    const currentDate = new Date();
    const nextMonth = new Date(currentDate);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    await prisma.membership.create({
      data: {
        userId: user.id,
        status: 'INACTIVE', // Will be activated after first payment
        monthlyFee: 20.00,
        currentPeriodStart: currentDate,
        currentPeriodEnd: nextMonth,
        nextPaymentDate: nextMonth,
      },
    });

    // Return user data (without password)
    const { password: _password, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: 'Usuário criado com sucesso',
      user: userWithoutPassword,
    }, { status: 201 });

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Registration error:', error);
    }

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dados inválidos', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
