export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import type { NextRequest } from 'next/server'
import { contactSchema } from '@/lib/validations'
import { withValidation, withApiRateLimit } from '@/lib/api-wrapper'
import { handleApiError } from '@/lib/api-errors'

export async function GET(request: NextRequest) {
  try {
    const type = request.nextUrl.searchParams.get('type')

    const where = type ? { type } : {}

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            communications: true,
            appointments: true,
            complaints: true,
          },
        },
      },
    })

    const result = contacts.map((c) => ({
      ...c,
      communicationCount: c._count.communications,
      appointmentCount: c._count.appointments,
      complaintCount: c._count.complaints,
    }))

    return Response.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export const POST = withApiRateLimit(
  withValidation(contactSchema, async (request, body) => {
    try {
      const { type, firstName, lastName, email, phone, company, address, notes, source, leadStatus } = body

      const contact = await prisma.contact.create({
        data: {
          id: crypto.randomUUID(),
          type: type || 'individual',
          firstName,
          lastName,
          email: email || null,
          phone: phone || null,
          company: company || null,
          address: address || null,
          notes: notes || null,
          source: source || null,
          leadStatus: leadStatus || null,
        },
      })

      return Response.json(contact, { status: 201 })
    } catch (error) {
      return handleApiError(error)
    }
  })
)
