import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { UserRole, KycStatus, MembershipStatus } from '@prisma/client';
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import {
  findUserByEmail,
  verifyPassword,
  updateLastLogin,
} from './auth-helpers';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await findUserByEmail(credentials.email);

        if (!user) {
          return null;
        }

        const isPasswordValid = await verifyPassword(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          return null;
        }

        if (!user.isActive) {
          throw new Error('Account is deactivated');
        }

        // Update last login
        await updateLastLogin(user.id);

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          kycStatus: user.kycStatus,
          membershipStatus: user.membership?.status || 'INACTIVE',
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    maxAge: 24 * 60 * 60, // 24 hours
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.kycStatus = user.kycStatus;
        token.membershipStatus = user.membershipStatus;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!;
        session.user.role = token.role as UserRole;
        session.user.kycStatus = token.kycStatus as KycStatus;
        session.user.membershipStatus =
          token.membershipStatus as MembershipStatus;

        // Fetch fresh user data to get updated name
        const freshUser = await prisma.user.findUnique({
          where: { id: token.sub! },
          select: { firstName: true, lastName: true, email: true },
        });

        if (freshUser) {
          session.user.name = `${freshUser.firstName} ${freshUser.lastName}`;
          session.user.email = freshUser.email;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
