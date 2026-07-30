"use client"

import React from "react"
import { useCrud } from "@/hooks/use-crud"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, TrendingUp, TrendingDown, Wallet, Plus, ArrowUpRight, ArrowDownRight, Search } from "lucide-react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadialBarChart,
  RadialBar,
} from "recharts"
import { formatCurrency, formatDate } from "@/lib/utils"

const CATEGORIES = ["Income", "Expense", "Transfer", "Tax", "Salary", "Utilities", "Materials", "Equipment", "Other"]

const CATEGORY_COLORS: Record<string, string> = {
  Income: "#22C55E",
  Expense: "#EF4444",
  Transfer: "#4F46E5",
  Tax: "#EAB308",
  Salary: "#A855F7",
  Utilities: "#06B6D4",
  Materials: "#F97316",
  Equipment: "#EC4899",
  Other: "#94A3B8",
}

interface Transaction {
  id: string
  transactionNumber: string
  date: string
  type: string
  category?: string
  description: string | null
  totalAmount: string
  status: string
  createdAt: string
  lines: { id: string; accountName: string; accountType: string; debit: string; credit: string; description: string | null }[]
}

const defaultForm = {
  type: "journal",
  category: "Other",
  description: "",
  totalAmount: "",
  date: "",
  lines: [{ accountId: "", debit: "", credit: "", description: "" }],
}

function formatMonth(key: string) {
  const [y, m] = key.split("-")
  const d = new Date(Number(y), Number(m) - 1)
  return d.toLocaleString("en-US", { month: "short", year: "2-digit" })
}

export default function FinancePage() {
  const {
    data: transactions, loading, showModal, setShowModal,
    formData, setFormData, saving,
    handleSave,
  } = useCrud<any>({
    apiPath: "/api/finance",
    defaultForm,
    transformBody: (data) => ({
      ...data,
      totalAmount: data.totalAmount ? Number(data.totalAmount) : 0,
    }),
  })

  const totalIncome = transactions
    .filter((t: Transaction) => t.type === "income")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.totalAmount || "0"), 0)

  const totalExpenses = transactions
    .filter((t: Transaction) => t.type === "expense")
    .reduce((sum: number, t: Transaction) => sum + parseFloat(t.totalAmount || "0"), 0)

  const netProfit = totalIncome - totalExpenses

  const stats = [
    { label: "Total Income", value: formatCurrency(totalIncome), icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Total Expenses", value: formatCurrency(totalExpenses), icon: TrendingDown, color: "text-red-500", bg: "bg-red-50" },
    { label: "Net Profit", value: formatCurrency(netProfit), icon: DollarSign, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Transactions", value: transactions.length, icon: Wallet, color: "text-orange-500", bg: "bg-orange-50" },
  ]

  const monthlyData = React.useMemo(() => {
    const map: Record<string, { income: number; expense: number }> = {}
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      map[key] = { income: 0, expense: 0 }
    }
    transactions.forEach((t: any) => {
      const d = new Date(t.date)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
      if (key in map) {
        if (t.type === "income") map[key].income += Number(t.totalAmount)
        else if (t.type === "expense") map[key].expense += Number(t.totalAmount)
      }
    })
    return Object.entries(map).map(([month, vals]) => ({
      month: formatMonth(month),
      revenue: vals.income,
      expenses: vals.expense,
      cashFlow: vals.income - vals.expense,
    }))
  }, [transactions])

  const categoryBreakdown = React.useMemo(() => {
    const map: Record<string, number> = {}
    transactions.forEach((t: any) => {
      if (t.type === "expense") {
        const cat = t.category || "Other"
        map[cat] = (map[cat] || 0) + Number(t.totalAmount)
      }
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .filter((d) => d.value > 0)
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const totalBudget = 200000
  const budgetUsed = Math.min((totalIncome / totalBudget) * 100, 100)
  const budgetData = [{ name: "Budget", value: Math.round(budgetUsed), fill: budgetUsed > 80 ? "#EF4444" : budgetUsed > 50 ? "#EAB308" : "#4F46E5" }]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Accounting & Finance"
        description="Track income, expenses, and financial health"
        action={{ label: "New Transaction", icon: Plus, onClick: () => { setFormData(defaultForm); setShowModal(true) } }}
      />

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>Profit & Loss Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="flex flex-col items-center p-4 rounded-lg bg-emerald-50">
              <p className="text-sm font-medium text-emerald-700 mb-1">Total Income</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="flex flex-col items-center p-4 rounded-lg bg-red-50">
              <p className="text-sm font-medium text-red-700 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            </div>
            <div className={`flex flex-col items-center p-4 rounded-lg ${netProfit >= 0 ? "bg-blue-50" : "bg-orange-50"}`}>
              <p className={`text-sm font-medium mb-1 ${netProfit >= 0 ? "text-blue-700" : "text-orange-700"}`}>Net {netProfit >= 0 ? "Profit" : "Loss"}</p>
              <p className={`text-2xl font-bold ${netProfit >= 0 ? "text-blue-600" : "text-orange-600"}`}>{formatCurrency(Math.abs(netProfit))}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value, name) => [formatCurrency(Number(value)), name === "revenue" ? "Revenue" : "Expenses"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar dataKey="expenses" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Utilization</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height={200}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" barSize={18} data={budgetData} startAngle={180} endAngle={0}>
                <RadialBar dataKey="value" background={{ fill: "#E2E8F0" }} cornerRadius={10} />
              </RadialBarChart>
            </ResponsiveContainer>
            <div className="text-center -mt-4">
              <p className="text-3xl font-bold text-slate-900">{Math.round(budgetUsed)}%</p>
              <p className="text-sm text-slate-500">of {formatCurrency(totalBudget)} budget used</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={monthlyData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="cashFlowGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), "Cash Flow"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                />
                <Line type="monotone" dataKey="cashFlow" stroke="#22C55E" strokeWidth={3} dot={{ fill: "#22C55E", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">No expense data yet.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name] || "#94A3B8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0" }}
                  />
                  <Legend iconType="circle" iconSize={8} formatter={(value: string) => <span className="text-xs text-slate-600">{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Transactions</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search transactions..." className="rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-slate-500">Loading transactions...</div>
          ) : (
            <div className="space-y-3">
              {transactions.length === 0 ? (
                <div className="py-8 text-center text-slate-400">No transactions yet.</div>
              ) : transactions.map((t: Transaction) => (
                <div key={t.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${t.type === "income" ? "bg-emerald-50" : t.type === "expense" ? "bg-red-50" : "bg-blue-50"}`}>
                    {t.type === "income" ? <ArrowUpRight className="h-5 w-5 text-emerald-500" /> : t.type === "expense" ? <ArrowDownRight className="h-5 w-5 text-red-500" /> : <DollarSign className="h-5 w-5 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{t.description || t.transactionNumber}</p>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                      <Badge variant={t.type === "income" ? "success" : t.type === "expense" ? "destructive" : "default"} className="text-xs">
                        {t.type}
                      </Badge>
                      {t.category && (
                        <Badge variant="secondary" className="text-xs">{t.category}</Badge>
                      )}
                      <span>{t.transactionNumber}</span>
                      <span>•</span>
                      <span>{formatDate(t.date)}</span>
                    </div>
                  </div>
                  <p className={`text-lg font-bold ${t.type === "income" ? "text-emerald-600" : t.type === "expense" ? "text-red-600" : "text-blue-600"}`}>
                    {t.type === "expense" ? "-" : "+"}{formatCurrency(t.totalAmount || "0")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CRUDModal open={showModal} onClose={() => setShowModal(false)} onSave={handleSave} saving={saving} title="New Transaction" disabled={!formData.totalAmount}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
              <option value="journal">Journal</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
            <input type="number" value={formData.totalAmount} onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      </CRUDModal>
    </div>
  )
}
