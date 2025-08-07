import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';

import { authOptions } from './auth';

/**
 * Get the current user session on the server side
 */
export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

/**
 * Require authentication - redirect to login if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth/signin');
  }
  return user;
}

/**
 * Require specific role - redirect to unauthorized if insufficient permissions
 */
export async function requireRole(allowedRoles: UserRole[]) {
  const user = await requireAuth();
  
  if (!allowedRoles.includes(user.role)) {
    redirect('/unauthorized');
  }
  
  return user;
}

/**
 * Require admin role
 */
export async function requireAdmin() {
  return requireRole([UserRole.ADMIN, UserRole.SUPER_ADMIN]);
}

/**
 * Require super admin role
 */
export async function requireSuperAdmin() {
  return requireRole([UserRole.SUPER_ADMIN]);
}

/**
 * Check if user has specific role
 */
export function hasRole(userRole: UserRole, allowedRoles: UserRole[]): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: UserRole): boolean {
  return hasRole(userRole, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
}

/**
 * Check if user is super admin
 */
export function isSuperAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.SUPER_ADMIN;
}
