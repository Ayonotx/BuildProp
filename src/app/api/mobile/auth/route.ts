export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { mobileLoginSchema } from '@/lib/validations'
import { withValidation } from '@/lib/api-wrapper'
import { authRateLimit } from '@/lib/rate-limit'
import { handleApiError } from '@/lib/api-errors'
import { verifyPassword, generateToken, hashPassword } from '@/lib/auth-utils'
import { logAudit } from '@/lib/audit'

export const POST = withValidation(mobileLoginSchema, async (request, data) => {
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

    try {
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0].trim() : '127.0.0.1'
      await logAudit('mobile_login', 'auth', `Mobile login for ${email}`, user.id, ip)
    } catch {}

    return Response.json({
      success: true,
      token,
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
