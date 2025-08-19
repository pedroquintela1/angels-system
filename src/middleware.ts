import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  async function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    console.log('Middleware executing for:', pathname);

    // Allow access to maintenance page, auth routes, and API
    if (
      pathname === '/maintenance' ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/api/auth') ||
      pathname.startsWith('/api/maintenance-status') ||
      pathname.startsWith('/api/admin/maintenance')
    ) {
      console.log('Allowing access to excluded path:', pathname);
      return NextResponse.next();
    }

    // Check maintenance status directly via API for the most up-to-date state
    try {
      const maintenanceUrl = new URL('/api/maintenance-status', req.url);
      const response = await fetch(maintenanceUrl.toString());

      if (response.ok) {
        const maintenanceData = await response.json();
        console.log('Maintenance status check:', maintenanceData);

        if (maintenanceData.isInMaintenance) {
          // Check for force maintenance parameter (for testing purposes)
          const forceMaintenanceTest =
            req.nextUrl.searchParams.get('force-maintenance') === 'true';

          // Check if user can bypass maintenance mode (only admins, unless forced test)
          const canBypass = !forceMaintenanceTest && token?.role === 'ADMIN';
          console.log(
            'User role:',
            token?.role,
            'Can bypass:',
            canBypass,
            'Force test:',
            forceMaintenanceTest
          );

          if (!canBypass) {
            console.log('Redirecting to maintenance page for:', pathname);
            return NextResponse.redirect(new URL('/maintenance', req.url));
          }
        }
      } else {
        console.log('Failed to check maintenance status:', response.status);
      }
    } catch (error) {
      console.log('Error checking maintenance status:', error);
    }

    // Admin routes protection
    if (pathname.startsWith('/admin')) {
      const isAdmin = token?.role === 'ADMIN';

      if (!isAdmin) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Support routes protection
    if (pathname.startsWith('/admin/support')) {
      const hasAccess = token?.role === 'SUPPORT' || token?.role === 'ADMIN';

      if (!hasAccess) {
        return NextResponse.redirect(new URL('/unauthorized', req.url));
      }
    }

    // Financial routes protection
    if (pathname.startsWith('/admin/financial')) {
      const hasAccess = token?.role === 'FINANCIAL' || token?.role === 'ADMIN';

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
        if (
          pathname.startsWith('/auth') ||
          pathname === '/' ||
          pathname === '/maintenance' ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/api/maintenance-status')
        ) {
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
    // All routes except static files and API routes that should be excluded
    '/((?!_next/static|_next/image|favicon.ico|api/auth|api/maintenance-status).*)',
  ],
};
