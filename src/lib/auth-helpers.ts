import bcrypt from 'bcryptjs';

import { prisma } from './prisma';

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Find user by email for authentication
 */
export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      membership: true,
    },
  });
}

/**
 * Find user by ID
 */
export async function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    include: {
      membership: true,
    },
  });
}

/**
 * Update user's last login
 */
export async function updateLastLogin(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { updatedAt: new Date() },
  });
}

/**
 * Check if email is already taken
 */
export async function isEmailTaken(email: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { email },
  });
  return !!user;
}

/**
 * Check if CPF is already taken
 */
export async function isCPFTaken(cpf: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { cpf: cpf.replace(/\D/g, '') },
  });
  return !!user;
}

/**
 * Generate unique referral code
 */
export async function generateUniqueReferralCode(): Promise<string> {
  let referralCode: string;
  let isUnique = false;
  
  do {
    referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const existingCode = await prisma.user.findUnique({
      where: { referralCode },
    });
    isUnique = !existingCode;
  } while (!isUnique);

  return referralCode;
}
