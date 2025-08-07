import { UserRole } from '@prisma/client';

import { ROLE_DESCRIPTIONS, ROLE_COLORS } from '@/constants/permissions';

import { Badge } from './badge';

interface RoleBadgeProps {
  role: UserRole;
  showDescription?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Component to display user role as a badge
 * 
 * @param role - User role to display
 * @param showDescription - Whether to show role description as tooltip
 * @param size - Size of the badge
 */
export function RoleBadge({ role, showDescription = false, size = 'md' }: RoleBadgeProps) {
  const getVariant = (role: UserRole) => {
    switch (ROLE_COLORS[role]) {
      case 'blue':
        return 'info';
      case 'green':
        return 'success';
      case 'purple':
        return 'secondary';
      case 'orange':
        return 'warning';
      case 'red':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const getRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case UserRole.USER:
        return 'Usuário';
      case UserRole.SUPPORT:
        return 'Suporte';
      case UserRole.FINANCIAL:
        return 'Financeiro';
      case UserRole.ADMIN:
        return 'Admin';
      case UserRole.SUPER_ADMIN:
        return 'Super Admin';
      default:
        return role;
    }
  };

  const getSizeClass = (size: string): string => {
    switch (size) {
      case 'sm':
        return 'text-xs px-2 py-0.5';
      case 'lg':
        return 'text-sm px-3 py-1';
      default:
        return 'text-xs px-2.5 py-0.5';
    }
  };

  return (
    <div className="inline-flex items-center">
      <Badge 
        variant={getVariant(role)}
        className={getSizeClass(size)}
        title={showDescription ? ROLE_DESCRIPTIONS[role] : undefined}
      >
        {getRoleDisplayName(role)}
      </Badge>
    </div>
  );
}
