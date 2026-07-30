"use client"

import React, { useEffect, useState, useCallback } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { LoadingState } from "@/components/dashboard/loading-state"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { exportToPdf } from "@/lib/pdf-export"

interface AgingInvoice {
  id: string
  invoiceNumber: string
  contactName: string
  issueDate: string
  totalAmount: number
  paidAmount: number
  balance: number
  daysOverdue: number
  agingBucket: string
}

interface AgingData {
  invoices: AgingInvoice[]
  summary: {
    '0-30': number
    '31-60': number
    '61-90': number
    '90+': number
  }
  totalOutstanding: number
}

const bucketColors: Record<string, string> = {
  '0-30': 'bg-emerald-100 text-emerald-700',
  '31-60': 'bg-amber-100 text-amber-700',
  '61-90': 'bg-orange-100 text-orange-700',
  '90+': 'bg-red-100 text-red-700',
}

const bucketTextColors: Record<string, string> = {
  '0-30': 'text-emerald-600',
  '31-60': 'text-amber-600',
  '61-90': 'text-orange-600',
  '90+': 'text-red-600',
}

export default function AgingPage() {
  const [data, setData] = useState<AgingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/reports/aging")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load aging data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = filter === "all" ? data?.invoices || [] : (data?.invoices || []).filter(i => i.agingBucket === filter)

  function handleExport() {
    if (!data) return
    const rows = data.invoices.map(inv => [
      inv.invoiceNumber,
      inv.contactName,
      formatDate(inv.issueDate),
      formatCurrency(inv.balance),
      `${inv.daysOverdue} days`,
      inv.agingBucket,
    ])
    exportToPdf({
      title: "Accounts Receivable Aging",
      subtitle: `Total Outstanding: ${formatCurrency(data.totalOutstanding)}`,
      headers: ["Invoice #", "Client", "Issue Date", "Balance", "Days Overdue", "Bucket"],
      rows,
      filename: "ar-aging.pdf",
    })
  }

  if (loading) return <LoadingState message="Loading aging report..." />

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
        <p className="text-sm text-red-500">{error || "No data available"}</p>
        <Button onClick={fetchData} variant="outline" size="sm">Retry</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounts Receivable Aging"
        description="Outstanding invoices by age"
        actions={[
          { label: "Export PDF", icon: Download, onClick: handleExport, variant: "outline" as const },
        ]}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.totalOutstanding)}</p>
            <p className="text-xs text-slate-500 mt-1">{data.invoices.length} invoices</p>
          </CardContent>
        </Card>
        {(['0-30', '31-60', '61-90', '90+'] as const).map(bucket => (
          <Card key={bucket} className={filter === bucket ? 'ring-2 ring-orange-400' : ''}>
            <CardContent className="p-6 cursor-pointer" onClick={() => setFilter(filter === bucket ? 'all' : bucket)}>
              <p className="text-sm font-medium text-slate-500">{bucket} days</p>
              <p className={`text-2xl font-bold mt-1 ${bucketTextColors[bucket]}`}>
                {formatCurrency(data.summary[bucket])}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>
          All
        </Button>
        {(['0-30', '31-60', '61-90', '90+'] as const).map(bucket => (
          <Button
            key={bucket}
            variant={filter === bucket ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(filter === bucket ? 'all' : bucket)}
          >
            {bucket} days
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-400">No invoices in this aging bucket.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Issue Date</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Days Overdue</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{inv.contactName}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{formatDate(inv.issueDate)}</td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-900 text-right">{formatCurrency(inv.balance)}</td>
                      <td className="py-3 px-4 text-sm text-right">
                        <span className={bucketTextColors[inv.agingBucket]}>
                          {inv.daysOverdue} days
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bucketColors[inv.agingBucket]}`}>
                          {inv.agingBucket}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
