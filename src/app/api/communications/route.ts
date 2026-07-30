export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const communications = await prisma.communication.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        contact: true,
      },
    })

    const result = communications.map((c) => ({
      id: c.id,
      contactName: `${c.contact.firstName} ${c.contact.lastName}`,
      contactEmail: c.contact.email,
      contactPhone: c.contact.phone,
      type: c.type,
      direction: c.direction,
      subject: c.subject,
      content: c.content,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
    }))

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contactName, contactEmail, contactPhone, type, direction, subject, content, notes, status: commStatus } = body

    if (!type) {
      return Response.json({ error: "Communication type is required" }, { status: 400 })
    }

    let contact = null
    if (contactName) {
      const nameParts = contactName.trim().split(/\s+/)
      const firstName = nameParts[0] || contactName
      const lastName = nameParts.slice(1).join(" ") || contactName
      if (contactEmail) {
        contact = await prisma.contact.findFirst({ where: { email: contactEmail } })
      }
      if (!contact && contactPhone) {
        contact = await prisma.contact.findFirst({ where: { phone: contactPhone } })
      }
      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            id: crypto.randomUUID(),
            type: "individual",
            firstName,
            lastName,
            email: contactEmail || null,
            phone: contactPhone || null,
          },
        })
      }
    } else {
      contact = await prisma.contact.findFirst({ orderBy: { createdAt: "asc" } })
    }

    if (!contact) {
      return Response.json({ error: "No contacts found. Provide contactName or create a contact first." }, { status: 400 })
    }

    const communication = await prisma.communication.create({
      data: {
        id: crypto.randomUUID(),
        contactId: contact.id,
        type,
        direction: direction || "outbound",
        subject: subject || null,
        content: content || notes || null,
        createdBy: "Admin",
      },
    })

    return Response.json(communication, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}