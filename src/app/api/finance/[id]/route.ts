export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type { NextRequest } from 'next/server'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { lines: true },
    })

    if (!transaction) {
      return Response.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const accounts = await prisma.account.findMany({ select: { id: true, name: true, type: true } })
    const accountMap = new Map(accounts.map((a) => [a.id, a]))

    const result = {
      ...transaction,
      lines: transaction.lines.map((l) => {
        const acc = accountMap.get(l.accountId)
        return {
          ...l,
          accountName: acc?.name || 'Unknown',
          accountType: acc?.type || '',
        }
      }),
    }

    return Response.json(result)
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
    const allowed = ['date', 'type', 'description', 'totalAmount', 'status']
    for (const key of allowed) {
      if (key in body) {
        if (key === 'totalAmount') {
          data[key] = new Prisma.Decimal(body[key])
        } else if (key === 'date') {
          data[key] = body[key] ? new Date(body[key]) : undefined
        } else {
          data[key] = body[key]
        }
      }
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data,
      include: { lines: true },
    })

    return Response.json(transaction)
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
    await prisma.transactionLine.deleteMany({ where: { transactionId: id } })
    await prisma.transaction.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
