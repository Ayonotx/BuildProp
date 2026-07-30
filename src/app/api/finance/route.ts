export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  try {
    const [transactions, accounts] = await Promise.all([
      prisma.transaction.findMany({
        orderBy: { createdAt: 'desc' },
        include: { lines: true },
      }),
      prisma.account.findMany({ select: { id: true, name: true, type: true } }),
    ])

    const accountMap = new Map(accounts.map((a) => [a.id, a]))

    const result = transactions.map((t) => ({
      id: t.id,
      transactionNumber: t.transactionNumber,
      date: t.date,
      type: t.type,
      category: t.category,
      description: t.description,
      totalAmount: t.totalAmount,
      status: t.status,
      createdAt: t.createdAt,
      lines: t.lines.map((l) => {
        const acc = accountMap.get(l.accountId)
        return {
          id: l.id,
          accountId: l.accountId,
          accountName: acc?.name || 'Unknown',
          accountType: acc?.type || '',
          debit: l.debit,
          credit: l.credit,
          description: l.description,
        }
      }),
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
    const { type, category, description, totalAmount, date, lines } = body

    if (totalAmount !== undefined && (typeof totalAmount !== 'number' || totalAmount < 0)) {
      return Response.json({ error: 'Amount must be a non-negative number' }, { status: 400 })
    }

    const adminRole = await prisma.role.findFirst({
      where: { name: { in: ['Super Admin', 'Admin'] } },
    })
    let userId = ''
    if (adminRole) {
      const adminUser = await prisma.user.findFirst({ where: { roleId: adminRole.id } })
      if (adminUser) userId = adminUser.id
    }

    const count = await prisma.transaction.count()
    const txNumber = `TXN-${String(count + 1).padStart(5, '0')}`

    const transaction = await prisma.transaction.create({
      data: {
        transactionNumber: txNumber,
        date: date ? new Date(date) : new Date(),
        type: type || 'journal',
        category: category || null,
        description: description || null,
        totalAmount: totalAmount ? new Prisma.Decimal(totalAmount) : new Prisma.Decimal(0),
        status: 'posted',
        createdBy: userId,
        lines: {
          create: (lines || []).map((l: any) => ({
            accountId: l.accountId,
            debit: l.debit ? new Prisma.Decimal(l.debit) : new Prisma.Decimal(0),
            credit: l.credit ? new Prisma.Decimal(l.credit) : new Prisma.Decimal(0),
            description: l.description || null,
          })),
        },
      },
      include: { lines: true },
    })

    return Response.json(transaction, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
