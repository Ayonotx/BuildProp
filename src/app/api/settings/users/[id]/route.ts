export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth-utils'
import { handleApiError } from '@/lib/api-errors'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        roleId: true,
        role: { select: { id: true, name: true } },
      },
    })

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 })
    }

    return Response.json(user)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { firstName, lastName, email, phone, roleId, password, isActive } = body

    const data: Record<string, unknown> = {}

    if (firstName !== undefined) data.firstName = firstName
    if (lastName !== undefined) data.lastName = lastName
    if (email !== undefined) data.email = email
    if (phone !== undefined) data.phone = phone || null
    if (roleId !== undefined) data.roleId = roleId
    if (isActive !== undefined) data.isActive = isActive

    if (password && password.trim()) {
      data.passwordHash = await hashPassword(password)
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { id: true, name: true } },
      },
    })

    return Response.json({ success: true, user })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.user.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
