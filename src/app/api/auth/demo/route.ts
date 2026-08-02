export const dynamic = 'force-dynamic'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-errors'
import { generateToken, hashPassword } from '@/lib/auth-utils'
import { logAudit } from '@/lib/audit'
import { readFile, writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { DEMO_MODE } from '@/lib/features'

const sessionsPath = join(process.cwd(), 'data', 'sessions.json')
const settingsPath = join(process.cwd(), 'data', 'settings.json')

export async function POST(request: Request) {
  if (!DEMO_MODE) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    // 1. Prefer the first active Super Admin; fall back to any active user.
    let user = await prisma.user.findFirst({
      where: { isActive: true, role: { name: 'Super Admin' } },
      include: { role: true },
      orderBy: { createdAt: 'asc' },
    })

    if (!user) {
      user = await prisma.user.findFirst({
        where: { isActive: true },
        include: { role: true },
        orderBy: { createdAt: 'asc' },
      })
    }

    // 2. Fresh machine (zero users): create a minimal demo company + Super Admin
    //    so demo login bypasses the setup wizard entirely.
    if (!user) {
      const userCount = await prisma.user.count()
      if (userCount > 0) {
        return Response.json(
          { error: 'No active user available for demo login' },
          { status: 403 }
        )
      }

      // Demo company settings — mirrors the setup wizard's settings.json write.
      try {
        let existing: any = {}
        try {
          const content = await readFile(settingsPath, 'utf-8')
          existing = JSON.parse(content)
        } catch {
          // No existing settings file
        }
        if (!existing.companyName) {
          await mkdir(join(process.cwd(), 'data'), { recursive: true })
          const settings = {
            ...existing,
            companyName: 'BuildProp Demo',
            timezone: 'UTC',
            currency: 'USD',
            fiscalYearStart: 'January',
            configured: true,
            configuredAt: new Date().toISOString(),
          }
          await writeFile(settingsPath, JSON.stringify(settings, null, 2))
        }
      } catch {}

      let role = await prisma.role.findFirst({ where: { name: 'Super Admin' } })
      if (!role) {
        role = await prisma.role.findFirst({ orderBy: { level: 'desc' } })
      }
      if (!role) {
        return Response.json(
          { error: 'No role available to assign to the admin user' },
          { status: 500 }
        )
      }

      const passwordHash = await hashPassword('DemoPass123!')
      const demoUser = await prisma.user.create({
        data: {
          email: 'demo@buildprop.com',
          passwordHash,
          firstName: 'Demo',
          lastName: 'User',
          roleId: role.id,
        },
        include: { role: true },
      })

      try {
        await logAudit('user_create', 'users', `Created demo Super Admin ${demoUser.email}`, demoUser.id)
      } catch {}

      user = demoUser
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
      await logAudit('demo_login', 'auth', 'Demo login', user.id, ip)
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
}
