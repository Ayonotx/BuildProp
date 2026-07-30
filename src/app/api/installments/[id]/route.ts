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
    const plan = await prisma.installmentPlan.findUnique({
      where: { id },
      include: {
        installments: {
          orderBy: { installmentNumber: 'asc' },
        },
      },
    })

    if (!plan) {
      return Response.json({ error: 'Plan not found' }, { status: 404 })
    }

    return Response.json(plan)
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

    if (body.installmentId) {
      const installment = await prisma.installment.update({
        where: { id: body.installmentId },
        data: {
          status: body.status || 'paid',
          paidDate: body.paidDate ? new Date(body.paidDate) : new Date(),
          paidAmount: body.paidAmount ? new Prisma.Decimal(body.paidAmount) : undefined,
          notes: body.notes || undefined,
        },
      })

      const plan = await prisma.installmentPlan.findUnique({
        where: { id },
        include: { installments: true },
      })

      if (plan) {
        const totalPaid = plan.installments.reduce(
          (sum, inst) => sum + Number(inst.paidAmount),
          0
        )
        const allPaid = plan.installments.every((inst) => inst.status === 'paid')
        const anyOverdue = plan.installments.some((inst) => inst.status === 'overdue')

        await prisma.installmentPlan.update({
          where: { id },
          data: {
            status: allPaid ? 'completed' : anyOverdue ? 'defaulted' : 'active',
          },
        })
      }

      return Response.json(installment)
    }

    if (body.status) {
      const plan = await prisma.installmentPlan.update({
        where: { id },
        data: { status: body.status },
      })
      return Response.json(plan)
    }

    return Response.json({ error: 'No valid update fields' }, { status: 400 })
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
    await prisma.installment.deleteMany({ where: { planId: id } })
    await prisma.installmentPlan.delete({ where: { id } })
    return Response.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
