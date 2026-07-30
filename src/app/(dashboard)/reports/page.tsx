"use client"

import React, { useEffect, useState, useCallback } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { LoadingState } from "@/components/dashboard/loading-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, TrendingUp, DollarSign, Users, Calendar } from "lucide-react"
import { exportToPdf, exportAllReports } from "@/lib/pdf-export"
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { formatCurrency, formatDate } from "@/lib/utils"

interface ReportsData {
  projectsByStatus: { planning: number; in_progress: number; completed: number; on_hold: number }
  totalProjects: number
  revenue: number
  expenses: number
  netProfit: number
  propertiesByStatus: { available: number; sold: number; rented: number; maintenance: number }
  totalProperties: number
  employeeCount: number
  activeEmployees: number
  inventoryValue: number
  totalSuppliers: number
  totalPOs: number
  pendingPOs: number
  totalSpend: number
  topProjects: { name: string; budget: number; spent: number }[]
  monthlyRevenue: { month: string; revenue: number }[]
  monthlyExpenses: { month: string; expenses: number }[]
  totalRevenue: number
  projectProfitability: { id: string; name: string; status: string; budgeted: number; spent: number; budget: number; variance: number; variancePercent: number }[]
}

const DATE_RANGES = [
  { key: "30d", label: "Last 30 Days" },
  { key: "quarter", label: "This Quarter" },
  { key: "year", label: "This Year" },
  { key: "all", label: "All Time" },
]

export default function ReportsPage() {
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showComingSoon, setShowComingSoon] = useState(false)
  const [dateRange, setDateRange] = useState("all")

  const fetchData = useCallback(async (range: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/reports?range=${range}`)
      const json = await res.json()
      setData(json)
    } catch { /* */ } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(dateRange) }, [dateRange, fetchData])

  function handleExportPdf() {
    if (!data) return
    exportToPdf({
      title: "Reports & Analytics",
      subtitle: "Business overview report",
      headers: ["Metric", "Value"],
      rows: [
        ["Total Revenue", formatCurrency(data.revenue)],
        ["Total Expenses", formatCurrency(data.expenses)],
        ["Net Profit", formatCurrency(data.netProfit)],
        ["Total Projects", String(data.totalProjects)],
        ["Total Properties", String(data.totalProperties)],
        ["Active Employees", String(data.activeEmployees)],
        ["Inventory Value", formatCurrency(data.inventoryValue)],
        ["Total Suppliers", String(data.totalSuppliers)],
        ["Purchase Orders", String(data.totalPOs)],
        ["Total Spend", formatCurrency(data.totalSpend)],
      ],
      filename: "reports.pdf",
    })
  }

  function handleExportAll() {
    if (!data) return
    exportAllReports({
      title: "Complete Business Report",
      subtitle: `Generated on ${formatDate(new Date())}`,
      sections: [
        {
          title: "Financial Summary",
          headers: ["Metric", "Value"],
          rows: [
            ["Total Revenue", formatCurrency(data.revenue)],
            ["Total Expenses", formatCurrency(data.expenses)],
            ["Net Profit", formatCurrency(data.netProfit)],
            ["Total Spend", formatCurrency(data.totalSpend)],
          ],
        },
        {
          title: "Projects Overview",
          headers: ["Metric", "Value"],
          rows: [
            ["Total Projects", String(data.totalProjects)],
            ["Planning", String(data.projectsByStatus.planning)],
            ["In Progress", String(data.projectsByStatus.in_progress)],
            ["On Hold", String(data.projectsByStatus.on_hold)],
            ["Completed", String(data.projectsByStatus.completed)],
          ],
        },
        {
          title: "Properties",
          headers: ["Metric", "Value"],
          rows: [
            ["Total Properties", String(data.totalProperties)],
            ["Available", String(data.propertiesByStatus.available)],
            ["Sold", String(data.propertiesByStatus.sold)],
            ["Rented", String(data.propertiesByStatus.rented)],
            ["Maintenance", String(data.propertiesByStatus.maintenance)],
          ],
        },
        {
          title: "Operations",
          headers: ["Metric", "Value"],
          rows: [
            ["Employee Count", String(data.employeeCount)],
            ["Active Employees", String(data.activeEmployees)],
            ["Inventory Value", formatCurrency(data.inventoryValue)],
            ["Total Suppliers", String(data.totalSuppliers)],
            ["Purchase Orders", String(data.totalPOs)],
            ["Pending POs", String(data.pendingPOs)],
          ],
        },
        {
          title: "Top Projects by Budget",
          headers: ["Project", "Budget", "Spent"],
          rows: data.topProjects.map((p) => [p.name, formatCurrency(p.budget), formatCurrency(p.spent)]),
        },
        {
          title: "Monthly Revenue",
          headers: ["Month", "Revenue"],
          rows: data.monthlyRevenue.filter((m) => m.revenue > 0).map((m) => [m.month, formatCurrency(m.revenue)]),
        },
      ],
      filename: "complete-report.pdf",
    })
  }

  const kpiCards = data ? [
    { label: "Total Revenue", value: formatCurrency(data.revenue), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Total Expenses", value: formatCurrency(data.expenses), icon: DollarSign, color: "text-red-500", bg: "bg-red-50" },
    { label: "Net Profit", value: formatCurrency(data.netProfit), icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Employees", value: data.activeEmployees, icon: Users, color: "text-purple-500", bg: "bg-purple-50" },
  ] : []

  const revenueVsExpensesData = data ? (() => {
    const revMap = new Map(data.monthlyRevenue.map((m) => [m.month, m.revenue]))
    const expMap = new Map(data.monthlyExpenses.map((m) => [m.month, m.expenses]))
    const months = data.monthlyRevenue.map((m) => m.month)
    return months.map((month) => ({
      month,
      revenue: revMap.get(month) || 0,
      expenses: expMap.get(month) || 0,
    }))
  })() : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Generate and view business reports"
        action={{ label: "Custom Report", icon: FileText, onClick: () => setShowComingSoon(true) }}
        actions={[
          { label: "Export PDF", icon: Download, onClick: handleExportPdf, variant: "outline" },
          { label: "Export All", icon: Download, onClick: handleExportAll, variant: "outline" },
        ]}
      />

      {showComingSoon && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-amber-800 font-medium">Custom Report builder coming soon! For now, use the Export PDF button to generate reports.</p>
          </div>
          <button onClick={() => setShowComingSoon(false)} className="text-amber-500 hover:text-amber-700 text-sm font-medium">Dismiss</button>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-slate-500" />
        {DATE_RANGES.map((r) => (
          <Button
            key={r.key}
            variant={dateRange === r.key ? "default" : "outline"}
            size="sm"
            onClick={() => setDateRange(r.key)}
          >
            {r.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading reports..." />
      ) : data && (
        <>
          <StatsGrid stats={kpiCards} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue vs Expenses</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={revenueVsExpensesData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="reportRevGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(Number(value)), name === "revenue" ? "Revenue" : "Expenses"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="url(#reportRevGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Projects by Budget</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.topProjects.map((p) => ({ name: p.name.length > 14 ? p.name.slice(0, 14) + "\u2026" : p.name, budget: p.budget, spent: p.spent }))} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} width={100} />
                    <Tooltip
                      formatter={(value, name) => [formatCurrency(Number(value)), name === "budget" ? "Budget" : "Spent"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                    />
                    <Legend />
                    <Bar dataKey="budget" name="Budget" fill="#94A3B8" radius={[0, 4, 4, 0]} maxBarSize={16} />
                    <Bar dataKey="spent" name="Spent" fill="#4F46E5" radius={[0, 4, 4, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Projects by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Planning", value: data.projectsByStatus.planning, color: "#9CA3AF" },
                        { name: "In Progress", value: data.projectsByStatus.in_progress, color: "#4F46E5" },
                        { name: "On Hold", value: data.projectsByStatus.on_hold, color: "#EAB308" },
                        { name: "Completed", value: data.projectsByStatus.completed, color: "#22C55E" },
                      ].filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {[
                        { name: "Planning", value: data.projectsByStatus.planning, color: "#9CA3AF" },
                        { name: "In Progress", value: data.projectsByStatus.in_progress, color: "#4F46E5" },
                        { name: "On Hold", value: data.projectsByStatus.on_hold, color: "#EAB308" },
                        { name: "Completed", value: data.projectsByStatus.completed, color: "#22C55E" },
                      ].filter((d) => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [`${value} projects`, name]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
                    />
                    <Legend iconType="circle" iconSize={8} formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Properties by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={[
                    { status: "Available", count: data.propertiesByStatus.available },
                    { status: "Sold", count: data.propertiesByStatus.sold },
                    { status: "Rented", count: data.propertiesByStatus.rented },
                    { status: "Maintenance", count: data.propertiesByStatus.maintenance },
                  ]} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [`${value} properties`, "Count"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                      {[
                        { status: "Available", fill: "#4F46E5" },
                        { status: "Sold", fill: "#22C55E" },
                        { status: "Rented", fill: "#EAB308" },
                        { status: "Maintenance", fill: "#EF4444" },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Total Projects</span>
                    <span className="font-bold text-slate-900">{data.totalProjects}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Total Properties</span>
                    <span className="font-bold text-slate-900">{data.totalProperties}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Inventory Value</span>
                    <span className="font-bold text-slate-900">{formatCurrency(data.inventoryValue)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Suppliers</span>
                    <span className="font-bold text-slate-900">{data.totalSuppliers}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Purchase Orders</span>
                    <span className="font-bold text-slate-900">{data.totalPOs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Total Spend</span>
                    <span className="font-bold text-slate-900">{formatCurrency(data.totalSpend)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {data.projectProfitability && data.projectProfitability.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Project Profitability</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.projectProfitability} layout="vertical" margin={{ left: 100 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis type="number" tick={{ fontSize: 12, fill: "#64748B" }} tickFormatter={(v) => `GHS ${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} width={100} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), '']} />
                  <Bar dataKey="budgeted" fill="#94A3B8" name="Budget" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="spent" fill="#f97316" name="Spent" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>

              <table className="w-full mt-4">
                <thead>
                  <tr className="text-xs text-slate-500 uppercase">
                    <th className="text-left py-2">Project</th>
                    <th className="text-right py-2">Budget</th>
                    <th className="text-right py-2">Spent</th>
                    <th className="text-right py-2">Variance</th>
                    <th className="text-right py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.projectProfitability.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100">
                      <td className="py-2 text-sm font-medium">{p.name}</td>
                      <td className="py-2 text-sm text-right">{formatCurrency(p.budgeted)}</td>
                      <td className="py-2 text-sm text-right">{formatCurrency(p.spent)}</td>
                      <td className={`py-2 text-sm text-right font-medium ${p.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(p.variance)}
                      </td>
                      <td className="py-2 text-right">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          p.variancePercent >= 10 ? 'bg-green-100 text-green-700' :
                          p.variancePercent >= 0 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {p.variancePercent >= 0 ? 'On Track' : 'Over Budget'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
