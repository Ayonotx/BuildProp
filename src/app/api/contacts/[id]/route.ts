export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contact = await prisma.contact.findUnique({
      where: { id },
    })

    if (!contact) {
      return Response.json({ error: 'Contact not found' }, { status: 404 })
    }

    return Response.json(contact)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const data: Record<string, unknown> = {}
    const allowed = ['type', 'firstName', 'lastName', 'email', 'phone', 'company', 'address', 'notes', 'source', 'leadStatus']
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key]
      }
    }

    const contact = await prisma.contact.update({
      where: { id },
      data,
    })

    return Response.json(contact)
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
    const { id } = await params
    await prisma.contact.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
