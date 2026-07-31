export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { loginSchema } from '@/lib/validations'
import { withValidation } from '@/lib/api-wrapper'
import { authRateLimit } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-errors'
import { verifyPassword, generateToken, hashPassword } from '@/lib/auth-utils'
import { logAudit } from '@/lib/audit'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const sessionsPath = join(process.cwd(), 'data', 'sessions.json')

export const POST = withValidation(loginSchema, async (request, data) => {
  try {
    const { email, password } = data

    const rateResult = authRateLimit(request)
    if (!rateResult.allowed) {
      return Response.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    })

    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const isValid = await verifyPassword(password, user.passwordHash)

    if (!isValid) {
      if (user.passwordHash.startsWith('plain:')) {
        const plainPassword = user.passwordHash.slice(6)
        if (plainPassword === password) {
          const newHash = await hashPassword(password)
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash: newHash },
          })
        } else {
          return Response.json({ error: 'Invalid credentials' }, { status: 401 })
        }
      } else {
        return Response.json({ error: 'Invalid credentials' }, { status: 401 })
      }
    }

    if (!user.isActive) {
      return Response.json(
        { error: "Your account has been deactivated. Contact your administrator." },
        { status: 401 }
      )
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role.name,
    })

    const cookieStore = await cookies()
    cookieStore.set('buildprop_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    // Create session entry
    try {
      await mkdir(join(process.cwd(), 'data'), { recursive: true })
      let sessions: any[] = []
      try {
        const content = await readFile(sessionsPath, 'utf-8')
        sessions = JSON.parse(content)
      } catch {}

      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
      const userAgent = request.headers.get('user-agent') || 'Unknown'

      const sessionEntry = {
        id: crypto.randomUUID(),
        userId: user.id,
        loginTime: new Date().toISOString(),
        ip,
        userAgent,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      }
      sessions.push(sessionEntry)
      await writeFile(sessionsPath, JSON.stringify(sessions, null, 2))
    } catch {}

    // Audit log
    try {
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
      await logAudit('login', 'auth', `User ${email} logged in`, user.id, ip)
    } catch {}

    return Response.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: { name: user.role.name },
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
})
