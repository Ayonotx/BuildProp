import { cookies, headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// Resolves the currently authenticated user. Prefers the httpOnly JWT cookie;
// falls back to an Authorization: Bearer header (used by the mobile app, whose
// requests already pass token validation in src/proxy.ts). Returns null when
// there is no valid session or the user no longer exists.
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    let token = cookieStore.get('buildprop_token')?.value
    if (!token) {
      const headerStore = await headers()
      const auth = headerStore.get('authorization')
      if (auth && auth.startsWith('Bearer ')) token = auth.slice(7)
    }
    if (!token) return null

    const payload = verifyToken(token)
    if (!payload) return null

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { role: true },
    })
    return user
  } catch {
    return null
  }
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
