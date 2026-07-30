export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-errors'

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { vehicles: true, contracts: true },
        },
      },
    })

    const result = branches.map((b) => ({
      id: b.id,
      name: b.name,
      code: b.code,
      address: b.address,
      city: b.city,
      phone: b.phone,
      email: b.email,
      manager: b.manager,
      status: b.status,
      vehicleCount: b._count.vehicles,
      contractCount: b._count.contracts,
      createdAt: b.createdAt,
    }))

    return Response.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, code, address, city, phone, email, manager, status } = body

    if (!name || !code || !address || !city) {
      return Response.json({ error: 'Name, code, address, and city are required' }, { status: 400 })
    }

    const branch = await prisma.branch.create({
      data: {
        name,
        code,
        address,
        city,
        phone: phone || null,
        email: email || null,
        manager: manager || null,
        status: status || 'active',
      },
    })

    return Response.json(branch, { status: 201 })
  } catch (error) {
    return handleApiError(error)
  }
}
