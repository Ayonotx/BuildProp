export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-utils'

const EXPORTABLE_MODELS = [
  'properties', 'projects', 'contacts', 'invoices', 'payments',
  'employees', 'suppliers', 'tasks', 'leases', 'purchaseOrders',
  'transactions', 'landRecords',
] as const

type ExportModel = (typeof EXPORTABLE_MODELS)[number]

const MODEL_MAP: Record<ExportModel, { label: string; query: (userId: string) => any }> = {
  properties: { label: 'Properties', query: () => prisma.property.findMany({ orderBy: { createdAt: 'desc' } }) },
  projects: { label: 'Projects', query: () => prisma.project.findMany({ orderBy: { createdAt: 'desc' } }) },
  contacts: { label: 'Contacts', query: () => prisma.contact.findMany({ orderBy: { createdAt: 'desc' } }) },
  invoices: { label: 'Invoices', query: () => prisma.invoice.findMany({ orderBy: { createdAt: 'desc' } }) },
  payments: { label: 'Payments', query: () => prisma.payment.findMany({ orderBy: { createdAt: 'desc' } }) },
  employees: { label: 'Employees', query: () => prisma.employee.findMany({ orderBy: { createdAt: 'desc' } }) },
  suppliers: { label: 'Suppliers', query: () => prisma.supplier.findMany({ orderBy: { name: 'asc' } }) },
  tasks: { label: 'Tasks', query: () => (prisma as any).projectTask.findMany({ orderBy: { createdAt: 'desc' } }) },
  leases: { label: 'Leases', query: () => prisma.lease.findMany({ orderBy: { startDate: 'desc' } }) },
  purchaseOrders: { label: 'Purchase Orders', query: () => prisma.purchaseOrder.findMany({ orderBy: { createdAt: 'desc' } }) },
  transactions: { label: 'Transactions', query: () => prisma.transaction.findMany({ orderBy: { date: 'desc' } }) },
  landRecords: { label: 'Land Records', query: () => prisma.landRecord.findMany({ orderBy: { createdAt: 'desc' } }) },
}

function flattenObject(obj: any, prefix: string = ''): Record<string, any> {
  const result: Record<string, any> = {}
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? prefix + '.' + key : key
    if (value === null || value === undefined) {
      result[newKey] = ''
    } else if (value instanceof Date) {
      result[newKey] = value.toISOString().split('T')[0]
    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      result[newKey] = String(value)
    } else if (typeof (value as any)?.toFixed === 'function') {
      result[newKey] = String(value)
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey))
    } else {
      result[newKey] = String(value ?? '')
    }
  }
  return result
}

function toCSV(data: Record<string, any>[]): string {
  if (data.length === 0) return 'No data'
  const headers = Array.from(new Set(data.flatMap(Object.keys)))
  const lines = [headers.join(',')]
  for (const row of data) {
    const vals = headers.map(h => {
      const v = row[h] ?? ''
      const s = String(v).replace(/"/g, '""')
      return s.includes(',') || s.includes('"') || s.includes('\n') ? '"' + s + '"' : s
    })
    lines.push(vals.join(','))
  }
  return lines.join('\n')
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const model = searchParams.get('model') as ExportModel | null
    if (!model || !EXPORTABLE_MODELS.includes(model)) {
      return Response.json({
        error: 'Invalid model. Valid models: ' + EXPORTABLE_MODELS.join(', '),
        models: EXPORTABLE_MODELS,
      }, { status: 400 })
    }
    const cookieStore = await cookies()
    const token = cookieStore.get('buildprop_token')?.value
    if (!token) return Response.json({ error: 'Authentication required' }, { status: 401 })
    const payload = verifyToken(token)
    if (!payload) return Response.json({ error: 'Invalid token' }, { status: 401 })
    const config = MODEL_MAP[model]
    const data = await config.query(payload.userId)
    const flat = data.map((item: any) => flattenObject(item))
    const csv = toCSV(flat)
    const filename = model + '-export-' + new Date().toISOString().split('T')[0] + '.csv'
    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[export] Error:', error)
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST() {
  const summary = EXPORTABLE_MODELS.map(m => ({ model: m, label: MODEL_MAP[m].label }))
  return Response.json({ models: summary, endpoint: 'GET /api/export?model=properties' })
}
