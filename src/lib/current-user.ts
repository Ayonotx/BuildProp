import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth-utils'

// Resolves the currently authenticated user from the httpOnly JWT cookie.
// Returns null when there is no valid session or the user no longer exists.
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('buildprop_token')?.value
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
