import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/profile',
  '/chat',
  '/discover',
  '/notifications',
  '/settings',
  '/onboarding',
  '/consent',
]

const AUTH_ROUTES = ['/login', '/register']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const refreshToken = request.cookies.get('refreshToken')?.value

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + '/'),
  )
  const isAuthRoute = AUTH_ROUTES.includes(pathname)

  if (isProtected && !refreshToken) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isAuthRoute && refreshToken) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/chat/:path*',
    '/discover/:path*',
    '/notifications/:path*',
    '/settings/:path*',
    '/onboarding/:path*',
    '/consent',
    '/login',
    '/register',
  ],
}
