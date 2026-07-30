export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' },
    })

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        items: true,
      },
    })

    const supplierResult = suppliers.map((s) => ({
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson,
      email: s.email,
      phone: s.phone,
      address: s.address,
      rating: s.rating,
      status: s.status,
    }))

    const poResult = purchaseOrders.map((po) => ({
      id: po.id,
      poNumber: po.poNumber,
      supplierName: po.supplier.name,
      supplierId: po.supplierId,
      orderDate: po.orderDate,
      expectedDelivery: po.expectedDelivery,
      totalAmount: po.totalAmount,
      status: po.status,
      itemCount: po.items.length,
      items: po.items.map((i) => ({
        id: i.id,
        description: i.description,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        amount: i.amount,
      })),
      createdAt: po.createdAt,
    }))

    return Response.json({ suppliers: supplierResult, purchaseOrders: poResult })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { supplierId: rawSupplierId, supplier, orderDate, expectedDelivery, totalAmount, items } = body

    // Resolve supplierId: use provided, or look up by supplier name
      let supplierId = rawSupplierId;
      if (!supplierId && supplier) {
        const found = await prisma.supplier.findFirst({ where: { name: { contains: supplier } } });
        if (found) supplierId = found.id;
        if (!supplierId) {
          const created = await prisma.supplier.create({ data: { id: crypto.randomUUID(), name: supplier } });
          supplierId = created.id;
        }
      }
      if (!supplierId) {
        return Response.json({ error: "Supplier is required. Provide supplierId or supplier name." }, { status: 400 });
      }

      const adminRole = await prisma.role.findFirst({
      where: { name: { in: ['Super Admin', 'Admin'] } },
    })
    let userId = ''
    if (adminRole) {
      const adminUser = await prisma.user.findFirst({ where: { roleId: adminRole.id } })
      if (adminUser) userId = adminUser.id
    }

    const count = await prisma.purchaseOrder.count()
    const poNumber = `PO-${String(count + 1).padStart(5, '0')}`

    const parsedItems = (items || []).map((i: any) => ({
      description: i.description || null,
      quantity: i.quantity ? new Prisma.Decimal(i.quantity) : new Prisma.Decimal(1),
      unitPrice: i.unitPrice ? new Prisma.Decimal(i.unitPrice) : new Prisma.Decimal(0),
      amount: i.amount ? new Prisma.Decimal(i.amount) : i.total ? new Prisma.Decimal(i.total) : new Prisma.Decimal(0),
    }))

    const calculatedTotal = parsedItems.reduce((sum: number, item: any) => {
      const amt = item.amount instanceof Prisma.Decimal ? item.amount.toNumber() : Number(item.amount || 0)
      const qty = item.quantity instanceof Prisma.Decimal ? item.quantity.toNumber() : Number(item.quantity || 0)
      const price = item.unitPrice instanceof Prisma.Decimal ? item.unitPrice.toNumber() : Number(item.unitPrice || 0)
      return sum + (amt || qty * price || 0)
    }, 0)

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        orderDate: orderDate ? new Date(orderDate) : new Date(),
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        totalAmount: totalAmount ? new Prisma.Decimal(totalAmount) : new Prisma.Decimal(calculatedTotal || 0),
        status: 'draft',
        createdBy: userId,
        items: {
          create: parsedItems,
        },
      },
      include: { supplier: true, items: true },
    })

    return Response.json(po, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
