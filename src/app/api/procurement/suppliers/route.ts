export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const search = request.nextUrl.searchParams.get('search')
    const category = request.nextUrl.searchParams.get('category')

    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { contactPerson: { contains: search } },
        { email: { contains: search } },
      ]
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { purchaseOrders: true } } },
    })

    const result = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      address: s.address,
      category: s.category,
      paymentTerms: s.paymentTerms,
      rating: s.rating,
      status: s.status,
      poCount: s._count.purchaseOrders,
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
    const { name, contactPerson, email, phone, address, category, paymentTerms, rating, status } = body

    if (!name) {
      return Response.json({ error: 'Name is required' }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson: contactPerson || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        category: category || 'materials',
        paymentTerms: paymentTerms || null,
        rating: rating ? new Prisma.Decimal(rating) : null,
        status: status || 'active',
      },
    })

    return Response.json(supplier, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
