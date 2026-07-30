export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'

export async function GET() {
  try {
    const appointments = await prisma.appointment.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        contact: true,
      },
    })

    const result = appointments.map((a) => ({
      id: a.id,
      contactName: `${a.contact.firstName} ${a.contact.lastName}`,
      contactEmail: a.contact.email,
      title: a.title,
      description: a.description,
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
      createdBy: a.createdBy,
      createdAt: a.createdAt,
    }))

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, description, startTime, endTime, status, contactName } = body

    if (!title || title.trim().length === 0) {
      return Response.json({ error: 'Event title is required' }, { status: 400 })
    }

    let contact = null
    if (contactName) {
      const nameParts = contactName.trim().split(/\s+/)
      const firstName = nameParts[0] || 'Unknown'
      const lastName = nameParts.slice(1).join(' ') || 'Contact'
      contact = await prisma.contact.findFirst({
        where: { firstName, lastName },
      })
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            type: 'individual',
            firstName,
            lastName,
          },
        })
      }
    } else {
      contact = await prisma.contact.findFirst({
        where: { firstName: 'Default' },
      })
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            type: 'individual',
            firstName: 'Default',
            lastName: 'Contact',
          },
        })
      }
    }

    const appointment = await prisma.appointment.create({
      data: {
        contactId: contact.id,
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime || startTime),
        status: status || 'scheduled',
        createdBy: 'System',
      },
    })

    return Response.json({
      id: appointment.id,
      contactName: `${contact.firstName} ${contact.lastName}`,
      contactEmail: contact.email,
      title: appointment.title,
      description: appointment.description,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      createdBy: appointment.createdBy,
      createdAt: appointment.createdAt,
    }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, title, description, startTime, endTime, status, contactName } = body

    if (!id) {
      return Response.json({ error: 'ID is required' }, { status: 400 })
    }

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

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      const body = await request.json().catch(() => null)
      const bodyId = body?.id
      if (!bodyId) {
        return Response.json({ error: 'ID is required' }, { status: 400 })
      }
      await prisma.appointment.delete({ where: { id: bodyId } })
      return Response.json({ success: true })
    }

    await prisma.appointment.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
