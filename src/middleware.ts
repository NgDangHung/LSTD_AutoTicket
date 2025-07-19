import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ✅ Helper function to get user info from API
async function getUserInfo(token: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'}/app/auths/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('❌ Failed to fetch user info:', error);
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ✅ Protected routes that require authentication
  const protectedRoutes = ['/admin', '/officer', '/test-queue'];
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  
  if (!isProtectedRoute) {
    return NextResponse.next();
  }
  
  // ✅ Get token from localStorage (client-side check will be handled by AuthGuard)
  // This middleware is mainly for server-side route protection
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');
  
  // For client-side navigation, we'll rely on AuthGuard component
  // Middleware primarily handles direct URL access
  
  console.log(`🔍 Middleware checking access to ${pathname}`);
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - login (login page)
     * - register (register page)
     * - kiosk (public kiosk interface)
     * - tv (public TV display)
     * - / (public home page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|login|register|kiosk|tv|$).*)',
  ],
};
