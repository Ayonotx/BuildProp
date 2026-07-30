export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const now = new Date()
    
    const unpaidInvoices = await prisma.invoice.findMany({
      where: { status: { not: 'paid' } },
      orderBy: { issueDate: 'asc' },
    })

    const contactIds = [...new Set(unpaidInvoices.map(inv => inv.contactId))]
    const contacts = await prisma.contact.findMany({
      where: { id: { in: contactIds } },
    })
    const contactMap = new Map(contacts.map(c => [c.id, `${c.firstName} ${c.lastName}`]))

    const aging = unpaidInvoices.map(inv => {
      const issueDate = new Date(inv.issueDate)
      const daysOverdue = Math.floor((now.getTime() - issueDate.getTime()) / (1000 * 60 * 60 * 24))
      const balance = Number(inv.totalAmount) - Number(inv.paidAmount)
      
      let agingBucket: string
      if (daysOverdue <= 30) agingBucket = '0-30'
      else if (daysOverdue <= 60) agingBucket = '31-60'
      else if (daysOverdue <= 90) agingBucket = '61-90'
      else agingBucket = '90+'

      return {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        contactName: contactMap.get(inv.contactId) || 'Unknown',
        issueDate: inv.issueDate,
        totalAmount: Number(inv.totalAmount),
        paidAmount: Number(inv.paidAmount),
        balance,
        daysOverdue,
        agingBucket,
      }
    })

    const summary = {
      '0-30': aging.filter(a => a.agingBucket === '0-30').reduce((s, a) => s + a.balance, 0),
      '31-60': aging.filter(a => a.agingBucket === '31-60').reduce((s, a) => s + a.balance, 0),
      '61-90': aging.filter(a => a.agingBucket === '61-90').reduce((s, a) => s + a.balance, 0),
      '90+': aging.filter(a => a.agingBucket === '90+').reduce((s, a) => s + a.balance, 0),
    }
    const totalOutstanding = Object.values(summary).reduce((s, v) => s + v, 0)

    return Response.json({ invoices: aging, summary, totalOutstanding })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
