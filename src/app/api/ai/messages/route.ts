export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('buildprop_token')?.value
  if (!token) return null
  const payload = verifyToken(token)
  return payload?.userId || null
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { conversationId, role, content, metadata } = body

    if (!conversationId || !role || !content) {
      return Response.json({ error: 'conversationId, role, and content are required' }, { status: 400 })
    }

    if (!['user', 'assistant', 'system'].includes(role)) {
      return Response.json({ error: 'role must be user, assistant, or system' }, { status: 400 })
    }

    const conversation = await prisma.aiConversation.findFirst({
      where: { id: conversationId, userId },
    })

    if (!conversation) {
      return Response.json({ error: 'Conversation not found' }, { status: 404 })
    }

    const message = await prisma.aiMessage.create({
      data: {
        conversationId,
        role,
        content,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    })

    return Response.json(message, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
