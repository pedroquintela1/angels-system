import { UserRole } from '@prisma/client';
import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // Admin routes protection
    if (pathname.startsWith('/admin')) {
      const isAdmin = token?.role === UserRole.ADMIN || token?.role === UserRole.SUPER_ADMIN;
      
      if (!isAdmin) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Super admin routes protection
    if (pathname.startsWith('/admin/system') || pathname.startsWith('/admin/users')) {
      const isSuperAdmin = token?.role === UserRole.SUPER_ADMIN;
      
      if (!isSuperAdmin) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Support routes protection
    if (pathname.startsWith('/admin/support')) {
      const hasAccess = token?.role === UserRole.SUPPORT || 
                       token?.role === UserRole.ADMIN || 
                       token?.role === UserRole.SUPER_ADMIN;
      
      if (!hasAccess) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Financial routes protection
    if (pathname.startsWith('/admin/financial')) {
      const hasAccess = token?.role === UserRole.FINANCIAL || 
                       token?.role === UserRole.ADMIN || 
                       token?.role === UserRole.SUPER_ADMIN;
      
      if (!hasAccess) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Public routes
        if (pathname.startsWith('/auth') || 
            pathname === '/' || 
            pathname.startsWith('/api/auth')) {
          return true;
        }

        // Protected routes require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Temporarily disabled for debugging
    // '/dashboard/:path*',
    // '/admin/:path*',
  ],
};
