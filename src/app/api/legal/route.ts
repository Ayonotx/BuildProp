export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { handleApiError } from '@/lib/api-errors'

export async function GET() {
  try {
    const [contracts, compliance] = await Promise.all([
      prisma.contract.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          branch: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.complianceItem.findMany({
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return Response.json({ contracts, compliance })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type } = body

    if (type === 'contract') {
      const { title, partyName, value, status, startDate, endDate, branchId, notes } = body
      if (!title || !partyName) {
        return Response.json({ error: 'Title and party name are required' }, { status: 400 })
      }
      const contract = await prisma.contract.create({
        data: {
          title,
          type: body.contractType || 'service',
          partyName,
          value: value || 0,
          status: status || 'active',
          startDate: startDate || new Date().toISOString().split('T')[0],
          endDate: endDate || new Date().toISOString().split('T')[0],
          branchId: branchId || null,
          notes: notes || null,
        },
      })
      return Response.json(contract, { status: 201 })
    }

    if (type === 'compliance') {
      const { title, description, category, status, dueDate, assignedTo } = body
      if (!title) {
        return Response.json({ error: 'Title is required' }, { status: 400 })
      }
      const item = await prisma.complianceItem.create({
        data: {
          title,
          description: description || null,
          category: category || 'regulatory',
          status: status || 'pending',
          dueDate: dueDate || null,
          completedDate: null,
          assignedTo: assignedTo || null,
        },
      })
      return Response.json(item, { status: 201 })
    }

    return Response.json({ error: 'Invalid type. Use "contract" or "compliance".' }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}
