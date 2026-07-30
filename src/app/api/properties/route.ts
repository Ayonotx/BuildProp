export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export async function GET() {
  try {
    const properties = await prisma.property.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { units: true } },
      },
    })

    const result = properties.map((p) => ({
      ...p,
      unitCount: p._count.units,
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
    const { name, description, propertyType, status, price, rentalPrice, areaSqft, bedrooms, bathrooms, address, city, state, images } = body

    if (!name || name.trim().length === 0) {
      return Response.json({ error: 'Property name is required' }, { status: 400 })
    }
    if (typeof price !== 'number' || price < 0) {
      return Response.json({ error: 'Price must be a non-negative number' }, { status: 400 })
    }

    let slug = generateSlug(name)
    const existing = await prisma.property.findUnique({ where: { slug } })
    if (existing) {
      slug = `${slug}-${Date.now()}`
    }

    const property = await prisma.property.create({
      data: {
        id: crypto.randomUUID(),
        name,
        slug,
        description: description || null,
        propertyType: propertyType || 'apartment',
        status: status || 'available',
        price: new Prisma.Decimal(price),
        rentalPrice: rentalPrice ? new Prisma.Decimal(rentalPrice) : null,
        areaSqft: areaSqft ? new Prisma.Decimal(areaSqft) : null,
        bedrooms: bedrooms ?? null,
        bathrooms: bathrooms ?? null,
        address: address || null,
        city: city || null,
        state: state || null,
        images: images || "[]",
      },
    })

    return Response.json(property, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
