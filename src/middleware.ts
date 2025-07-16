import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Skip middleware - sẽ handle authentication trên client-side với AuthGuard
  return NextResponse.next();
}

export const config = {
  matcher: ['/test-queue/:path*']
};
