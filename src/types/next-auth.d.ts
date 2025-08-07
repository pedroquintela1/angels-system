import { UserRole, KycStatus, MembershipStatus } from '@prisma/client';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      kycStatus: KycStatus;
      membershipStatus: MembershipStatus;
    };
  }

  interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    kycStatus: KycStatus;
    membershipStatus: MembershipStatus;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: UserRole;
    kycStatus: KycStatus;
    membershipStatus: MembershipStatus;
  }
}
