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

export async function GET() {
  try {
    const userId = await getUserId()
    if (!userId) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const conversations = await prisma.aiConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        model: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    })

    const result = conversations.map((c) => ({
      id: c.id,
      title: c.title,
      model: c.model,
      provider: c.provider,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    }))

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId()
    if (!userId) {
      return Response.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const { title, model, provider } = body

    const conversation = await prisma.aiConversation.create({
      data: {
        userId,
        title: title || 'New conversation',
        model: model || null,
        provider: provider || null,
      },
    })

    return Response.json(conversation, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
