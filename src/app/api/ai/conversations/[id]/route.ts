export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('buildprop_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  return payload?.userId || null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const conversation = await prisma.aiConversation.findFirst({
      where: { id, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            role: true,
            content: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
    })

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    return Response.json(conversation)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.aiConversation.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title } = body

    if (typeof title !== 'string' || !title.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 })
    }

    const conversation = await prisma.aiConversation.update({
      where: { id },
      data: { title: title.trim() },
    })

    return Response.json(conversation)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.aiConversation.findFirst({
      where: { id, userId },
    })

    if (!existing) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    await prisma.aiConversation.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
