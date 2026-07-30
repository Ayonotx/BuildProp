export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, description, startTime, endTime, status, contactName } = body

    const data: Record<string, unknown> = {}
    if (title !== undefined) data.title = title
    if (description !== undefined) data.description = description || null
    if (startTime !== undefined) data.startTime = new Date(startTime)
    if (endTime !== undefined) data.endTime = new Date(endTime)
    if (status !== undefined) data.status = status

    if (contactName) {
      const nameParts = contactName.trim().split(/\s+/)
      const firstName = nameParts[0] || 'Unknown'
      const lastName = nameParts.slice(1).join(' ') || 'Contact'
      let contact = await prisma.contact.findFirst({
        where: { firstName, lastName },
      })
      if (!contact) {
        contact = await prisma.contact.create({
          data: { type: 'individual', firstName, lastName },
        })
      }
      data.contactId = contact.id
    }

    const appointment = await prisma.appointment.update({
      where: { id },
      data,
      include: { contact: true },
    })

    return Response.json({
      id: appointment.id,
      contactName: `${appointment.contact.firstName} ${appointment.contact.lastName}`,
      contactEmail: appointment.contact.email,
      title: appointment.title,
      description: appointment.description,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      createdBy: appointment.createdBy,
      createdAt: appointment.createdAt,
    })
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
    await prisma.appointment.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
