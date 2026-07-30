"use client"

import React, { useEffect, useState, useCallback } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { LoadingState } from "@/components/dashboard/loading-state"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { exportToPdf } from "@/lib/pdf-export"

interface PnlData {
  period: string
  revenue: number
  cogs: number
  grossProfit: number
  grossMargin: number
  operatingExpenses: {
    total: number
    breakdown: Record<string, number>
  }
  netIncome: number
  netMargin: number
}

export default function PnlPage() {
  const [data, setData] = useState<PnlData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/reports/pnl")
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load P&L")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  function handleExport() {
    if (!data) return
    const rows: (string | number)[][] = [
      ["Revenue", formatCurrency(data.revenue)],
      ["", ""],
      ["Cost of Goods Sold", formatCurrency(data.cogs)],
      ["Gross Profit", formatCurrency(data.grossProfit)],
      [`Gross Margin`, `${data.grossMargin}%`],
      ["", ""],
      ["Operating Expenses", ""],
    ]
    Object.entries(data.operatingExpenses.breakdown).forEach(([cat, amount]) => {
      rows.push([`  ${cat}`, formatCurrency(amount)])
    })
    rows.push(["Total Operating Expenses", formatCurrency(data.operatingExpenses.total)])
    rows.push(["", ""])
    rows.push(["Net Income", formatCurrency(data.netIncome)])
    rows.push([`Net Margin`, `${data.netMargin}%`])

    exportToPdf({
      title: "Profit & Loss Statement",
      subtitle: data.period,
      headers: ["Line Item", "Amount"],
      rows,
      filename: "pnl-statement.pdf",
    })
  }

  if (loading) return <LoadingState message="Loading P&L statement..." />

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
        title="Profit & Loss Statement"
        description={data.period}
        actions={[
          { label: "Export PDF", icon: Download, onClick: handleExport, variant: "outline" as const },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.revenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Gross Profit</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(data.grossProfit)}</p>
            <p className="text-xs text-slate-500 mt-1">{data.grossMargin}% margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm font-medium text-slate-500">Net Income</p>
            <p className={`text-2xl font-bold mt-1 ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(data.netIncome)}
            </p>
            <p className="text-xs text-slate-500 mt-1">{data.netMargin}% margin</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Income Statement</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-0">
            {/* Revenue Section */}
            <div className="py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Revenue</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(data.revenue)}</span>
              </div>
            </div>

            {/* COGS */}
            <div className="py-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Cost of Goods Sold</span>
                <span className="text-sm font-medium text-slate-900">{formatCurrency(data.cogs)}</span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="py-3 border-b-2 border-slate-200 bg-slate-50 -mx-6 px-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-900">Gross Profit</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-slate-900">{formatCurrency(data.grossProfit)}</span>
                  <span className="text-xs text-slate-500 ml-2">({data.grossMargin}%)</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses Header */}
            <div className="pt-4 pb-2">
              <span className="text-sm font-semibold text-slate-900 uppercase tracking-wide">Operating Expenses</span>
            </div>

            {/* Expense Breakdown */}
            {Object.entries(data.operatingExpenses.breakdown).map(([category, amount]) => (
              <div key={category} className="py-2.5 border-b border-slate-50">
                <div className="flex items-center justify-between pl-4">
                  <span className="text-sm text-slate-600">{category}</span>
                  <span className="text-sm font-medium text-slate-900">{formatCurrency(amount)}</span>
                </div>
              </div>
            ))}

            {/* Total Operating Expenses */}
            <div className="py-3 border-b border-slate-200">
              <div className="flex items-center justify-between pl-4">
                <span className="text-sm font-semibold text-slate-700">Total Operating Expenses</span>
                <span className="text-sm font-bold text-slate-900">{formatCurrency(data.operatingExpenses.total)}</span>
              </div>
            </div>

            {/* Net Income */}
            <div className="py-4 bg-slate-50 -mx-6 px-6 rounded-b-lg">
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">Net Income</span>
                <div className="text-right">
                  <span className={`text-base font-bold ${data.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(data.netIncome)}
                  </span>
                  <span className="text-xs text-slate-500 ml-2">({data.netMargin}%)</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
