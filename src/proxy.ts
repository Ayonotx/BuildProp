import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'

const PUBLIC_PATHS = [
  '/login',
  '/setup',
  '/api/auth',
  '/api/auth/logout',
  '/api/auth/demo',
  '/api/mobile/auth',
  '/api/mobile/pair/confirm',
  '/api/email/oauth/callback',
  '/api/setup',
]

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,PATCH,OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
  'Access-Control-Max-Age': '86400',
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) return true
  if (pathname.startsWith('/_next/')) return true
  if (pathname === '/favicon.ico') return true
  if (/\.\w+$/.test(pathname)) return true
  return false
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/')
}

function withCors(res: NextResponse): Response {
  const response = res.clone()
  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    response.headers.set(key, value)
  }
  return response
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: CORS_HEADERS,
    })
  }

  if (isPublicPath(pathname)) {
    return withCors(NextResponse.next())
  }

  // The setup wizard must POST company + admin details to /api/settings before
  // any user exists (fresh install, no session yet). The route handler itself
  // enforces RBAC: on a populated DB only Super Admin/Admin may save settings.
  if (pathname === '/api/settings' && request.method === 'POST') {
    return withCors(NextResponse.next())
  }

  const cookieToken = request.cookies.get('buildprop_token')?.value
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  // API routes accept either the httpOnly cookie or an Authorization Bearer
  // token (mobile clients cannot use httpOnly cookies cross-origin). Page
  // routes still require the cookie.
  const token = isApiRoute(pathname) ? cookieToken || bearerToken : cookieToken

  if (!token || !verifyToken(token)) {
    if (isApiRoute(pathname)) {
      return withCors(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return withCors(NextResponse.redirect(loginUrl))
  }

  return withCors(NextResponse.next())
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
