export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const document = await prisma.document.findUnique({ where: { id } })

    if (!document) {
      return Response.json({ error: 'Document not found' }, { status: 404 })
    }

    return Response.json(document)
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
    const allowed = ['name', 'fileUrl', 'fileType', 'fileSize', 'category', 'entityId', 'entityType', 'uploadedBy']
    for (const key of allowed) {
      if (key in body) {
        data[key] = body[key]
      }
    }
    if ('name' in data) {
      data.version = { increment: 1 }
    }

    const document = await prisma.document.update({
      where: { id },
      data,
    })

    return Response.json(document)
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
    await prisma.document.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
