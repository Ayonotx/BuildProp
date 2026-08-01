import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth-utils'

const PUBLIC_PATHS = [
  '/login',
  '/setup',
  '/api/auth',
  '/api/auth/logout',
  '/api/auth/demo',
  '/api/setup',
]

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // The setup wizard must POST company + admin details to /api/settings before
  // any user exists (fresh install, no session yet). The route handler itself
  // enforces RBAC: on a populated DB only Super Admin/Admin may save settings.
  if (pathname === '/api/settings' && request.method === 'POST') {
    return NextResponse.next()
  }

  const token = request.cookies.get('buildprop_token')?.value

  if (!token || !verifyToken(token)) {
    if (isApiRoute(pathname)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
