"use client"

import React, { useEffect, useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, DollarSign, FileText, Users, Search, Printer, Download, Plus, Pencil, Trash2 } from "lucide-react"
import Link from "next/link"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { formatCurrency, formatDate } from "@/lib/utils"
import { printDocument } from "@/lib/print"
import { exportToCSV } from "@/lib/export-csv"
import { exportToPdf } from "@/lib/pdf-export"

interface SaleRecord {
  id: string
  saleNumber: string
  propertyName: string
  propertyId: string
  buyerName: string
  contactId: string
  salePrice: string
  commissionRate: string
  commissionAmount: string
  saleDate: string
  status: string
  paymentStatus: string
  notes: string | null
  createdAt: string
}

interface Property {
  id: string
  name: string
  price: string
  status: string
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  email: string | null
  type: string
}

const defaultForm = {
  propertyId: "",
  contactId: "",
  salePrice: "",
  commissionRate: "5",
  saleDate: new Date().toISOString().split("T")[0],
  status: "quotation",
  paymentStatus: "pending",
  notes: "",
}

const STATUS_OPTIONS = ["quotation", "reserved", "agreed", "completed", "cancelled"]
const PAYMENT_OPTIONS = ["pending", "paid", "installment"]

function statusVariant(s: string): "success" | "destructive" | "warning" | "default" | "secondary" {
  const n = s.toLowerCase()
  if (["completed", "active"].includes(n)) return "success"
  if (["cancelled"].includes(n)) return "destructive"
  if (["reserved", "agreed", "pending"].includes(n)) return "warning"
  if (["quotation"].includes(n)) return "default"
  if (["paid"].includes(n)) return "success"
  if (["installment"].includes(n)) return "warning"
  return "secondary"
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editSale, setEditSale] = useState<SaleRecord | null>(null)
  const [formData, setFormData] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const [salesRes, propsRes, contactsRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/properties"),
        fetch("/api/contacts?type=customer"),
      ])
      const salesData = await salesRes.json()
      const propsData = await propsRes.json()
      const contactsData = await contactsRes.json()
      if (Array.isArray(salesData)) setSales(salesData)
      if (Array.isArray(propsData)) setProperties(propsData)
      if (Array.isArray(contactsData)) setContacts(contactsData)
    } catch { /* */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  function openCreate() {
    setEditSale(null)
    setFormData(defaultForm)
    setShowModal(true)
  }

  function openEdit(sale: SaleRecord) {
    setEditSale(sale)
    setFormData({
      propertyId: sale.propertyId,
      contactId: sale.contactId,
      salePrice: sale.salePrice,
      commissionRate: sale.commissionRate,
      saleDate: sale.saleDate ? new Date(sale.saleDate).toISOString().split("T")[0] : "",
      status: sale.status,
      paymentStatus: sale.paymentStatus,
      notes: sale.notes || "",
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!formData.propertyId || !formData.contactId) {
      alert("Property and Buyer are required")
      return
    }
    setSaving(true)
    try {
      const url = editSale ? `/api/sales/${editSale.id}` : "/api/sales"
      const method = editSale ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          salePrice: formData.salePrice ? Number(formData.salePrice) : 0,
          commissionRate: formData.commissionRate ? Number(formData.commissionRate) : 0,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      setShowModal(false)
      setEditSale(null)
      fetchData()
    } catch {
      alert("Error saving sale")
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this sale?")) return
    try {
      const res = await fetch(`/api/sales/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      fetchData()
    } catch {
      alert("Error deleting sale")
    }
  }

  const filteredSales = sales.filter((s) =>
    (s.buyerName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.propertyName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.saleNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.status || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.paymentStatus || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalSalesValue = sales.reduce((sum, s) => sum + parseFloat(s.salePrice || "0"), 0)
  const totalCommission = sales.reduce((sum, s) => sum + parseFloat(s.commissionAmount || "0"), 0)
  const completedSales = sales.filter((s) => s.status === "completed")
  const completedValue = completedSales.reduce((sum, s) => sum + parseFloat(s.salePrice || "0"), 0)
  const activePipeline = sales.filter((s) => ["quotation", "reserved", "agreed"].includes(s.status))
  const pipelineValue = activePipeline.reduce((sum, s) => sum + parseFloat(s.salePrice || "0"), 0)

  const stats = [
    { label: "Total Sales Value", value: formatCurrency(totalSalesValue), icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Active Pipeline", value: `${activePipeline.length} (${formatCurrency(pipelineValue)})`, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Completed Sales", value: `${completedSales.length} (${formatCurrency(completedValue)})`, icon: FileText, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Total Commission", value: formatCurrency(totalCommission), icon: Users, color: "text-orange-500", bg: "bg-orange-50" },
  ]

  const pipelineData = [
    { stage: "Quotation", count: sales.filter((s) => s.status === "quotation").length, fill: "#94A3B8" },
    { stage: "Reserved", count: sales.filter((s) => s.status === "reserved").length, fill: "#60A5FA" },
    { stage: "Agreed", count: sales.filter((s) => s.status === "agreed").length, fill: "#4F46E5" },
    { stage: "Completed", count: completedSales.length, fill: "#22C55E" },
    { stage: "Cancelled", count: sales.filter((s) => s.status === "cancelled").length, fill: "#EF4444" },
  ]

  function buildMonthlyTrend() {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const now = new Date()
    const trend = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthIdx = d.getMonth()
      const year = d.getFullYear()
      const monthSales = sales.filter((s) => {
        const sd = new Date(s.saleDate)
        return sd.getMonth() === monthIdx && sd.getFullYear() === year && s.status === "completed"
      })
      trend.push({
        month: months[monthIdx],
        sales: monthSales.reduce((sum, s) => sum + parseFloat(s.salePrice || "0"), 0),
        deals: monthSales.length,
      })
    }
    return trend
  }

  const monthlySalesTrend = buildMonthlyTrend()

  function printSalesReport() {
    const rows = filteredSales.map((s) => [
      s.saleNumber,
      s.propertyName,
      s.buyerName,
      formatCurrency(s.salePrice),
      `${s.commissionRate}%`,
      formatCurrency(s.commissionAmount),
      s.status,
      s.paymentStatus,
      formatDate(s.saleDate),
    ])
    printDocument({
      title: "Sales Report",
      content: `
        <div class="section"><div class="section-label">Summary</div>
          <p><strong>Total Sales Value:</strong> ${formatCurrency(totalSalesValue)}</p>
          <p><strong>Active Pipeline:</strong> ${activePipeline.length} sales (${formatCurrency(pipelineValue)})</p>
          <p><strong>Completed Sales:</strong> ${completedSales.length} sales (${formatCurrency(completedValue)})</p>
          <p><strong>Total Commission:</strong> ${formatCurrency(totalCommission)}</p>
        </div>
        <div class="section"><div class="section-label">Sales Records</div>
          <table>
            <thead><tr><th>Sale #</th><th>Property</th><th>Buyer</th><th class="text-right">Price</th><th>Rate</th><th class="text-right">Commission</th><th>Status</th><th>Payment</th><th>Date</th></tr></thead>
            <tbody>${rows.map((row) => `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td><td class="text-right mono">${row[3]}</td><td>${row[4]}</td><td class="text-right mono">${row[5]}</td><td>${row[6]}</td><td>${row[7]}</td><td>${row[8]}</td></tr>`).join("")}</tbody>
          </table>
        </div>`,
    })
  }

  function printSale(s: SaleRecord) {
    printDocument({
      title: `Sale - ${s.saleNumber}`,
      content: `
        <div class="section"><div class="section-label">Sale Details</div>
          <p><strong>Sale Number:</strong> <span class="mono">${s.saleNumber}</span></p>
          <p><strong>Property:</strong> ${s.propertyName}</p>
          <p><strong>Buyer:</strong> ${s.buyerName}</p>
          <p><strong>Sale Date:</strong> ${formatDate(s.saleDate)}</p>
          <p><strong>Status:</strong> ${s.status.charAt(0).toUpperCase() + s.status.slice(1)}</p>
          <p><strong>Payment Status:</strong> ${s.paymentStatus.charAt(0).toUpperCase() + s.paymentStatus.slice(1)}</p>
        </div>
        <div class="section"><div class="section-label">Financials</div>
          <div class="totals"><table class="totals-table">
            <tr><td>Sale Price</td><td class="text-right mono">${formatCurrency(s.salePrice)}</td></tr>
            <tr><td>Commission (${s.commissionRate}%)</td><td class="text-right mono">${formatCurrency(s.commissionAmount)}</td></tr>
          </table></div>
        </div>
        ${s.notes ? `<div class="section"><div class="section-label">Notes</div><p>${s.notes}</p></div>` : ""}`,
    })
  }

  const columns: Column<SaleRecord>[] = [
    { key: "saleNumber", header: "Sale #", render: (s) => <span className="font-medium text-slate-900">{s.saleNumber}</span> },
    { key: "propertyName", header: "Property", render: (s) => <span className="text-sm text-slate-700">{s.propertyName}</span> },
    { key: "buyerName", header: "Buyer", render: (s) => <span className="text-sm text-slate-700">{s.buyerName}</span> },
    { key: "salePrice", header: "Sale Price", render: (s) => <span className="font-bold text-slate-900">{formatCurrency(s.salePrice || "0")}</span> },
    { key: "commissionAmount", header: "Commission", render: (s) => <span className="text-sm text-emerald-600 font-medium">{formatCurrency(s.commissionAmount || "0")}</span> },
    { key: "saleDate", header: "Date", render: (s) => <span className="text-sm text-slate-500">{formatDate(s.saleDate)}</span> },
    { key: "status", header: "Status", render: (s) => <Badge variant={statusVariant(s.status)}>{s.status}</Badge> },
    { key: "paymentStatus", header: "Payment", render: (s) => s.paymentStatus === "installment" ? <Link href="/installments"><Badge variant={statusVariant(s.paymentStatus)} className="cursor-pointer hover:opacity-80">{s.paymentStatus}</Badge></Link> : <Badge variant={statusVariant(s.paymentStatus)}>{s.paymentStatus}</Badge> },
    {
      key: "actions", header: "Actions",
      render: (s) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(s)} className="p-1.5 hover:bg-slate-100 rounded" title="Edit"><Pencil className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => printSale(s)} className="p-1.5 hover:bg-slate-100 rounded" title="Print"><Printer className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => handleDelete(s.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete"><Trash2 className="h-4 w-4 text-red-400" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Management"
        description="Property sales, quotations, and commissions"
        action={
          <div className="flex gap-3">
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Sale</Button>
            <Button variant="outline" onClick={() => exportToCSV(filteredSales.map((s) => ({
              "Sale #": s.saleNumber, "Property": s.propertyName, "Buyer": s.buyerName,
              "Sale Price": s.salePrice, "Commission Rate": s.commissionRate + "%",
              "Commission": s.commissionAmount, "Status": s.status, "Payment Status": s.paymentStatus,
              "Date": s.saleDate,
            })), "sales.csv")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Button variant="outline" onClick={() => exportToPdf({
              title: "Sales Report",
              subtitle: `${filteredSales.length} sales | Total Value: ${formatCurrency(totalSalesValue)}`,
              headers: ["Sale #", "Property", "Buyer", "Price", "Commission", "Status", "Payment", "Date"],
              rows: filteredSales.map((s) => [
                s.saleNumber, s.propertyName, s.buyerName,
                formatCurrency(s.salePrice), formatCurrency(s.commissionAmount),
                s.status, s.paymentStatus, formatDate(s.saleDate),
              ]),
              filename: "sales.pdf",
            })}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
            <Button variant="outline" onClick={printSalesReport}><Printer className="h-4 w-4 mr-2" />Print Report</Button>
          </div>
        }
      />

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pipelineData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  formatter={(value) => [`${value} deals`, "Count"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {pipelineData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlySalesTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesLineGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: "#64748B" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                <Tooltip
                  formatter={(value, name) => name === "sales" ? [formatCurrency(Number(value)), "Sales"] : [`${value}`, "Deals"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
                />
                <Line type="monotone" dataKey="sales" stroke="#4F46E5" strokeWidth={3} dot={{ fill: "#4F46E5", r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sales Records</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search sales..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400" />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={filteredSales} loading={loading} emptyMessage="No sales records yet. Create your first sale!" loadingMessage="Loading sales..." />
        </CardContent>
      </Card>

      <CRUDModal
        open={showModal}
        onClose={() => { setShowModal(false); setEditSale(null) }}
        title={editSale ? `Edit Sale ${editSale.saleNumber}` : "New Sale"}
        onSave={handleSave}
        saving={saving}
        saveLabel={editSale ? "Update Sale" : "Create Sale"}
        disabled={!formData.propertyId || !formData.contactId}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Property *</label>
            <select value={formData.propertyId} onChange={(e) => setFormData({ ...formData, propertyId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select property</option>
              {properties.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Buyer *</label>
            <select value={formData.contactId} onChange={(e) => setFormData({ ...formData, contactId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select buyer</option>
              {contacts.map((c) => (<option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sale Price</label>
            <input type="number" value={formData.salePrice} onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="0" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Commission Rate (%)</label>
            <input type="number" value={formData.commissionRate} onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="5" step="0.1" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Sale Date</label>
            <input type="date" value={formData.saleDate} onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Status</label>
            <select value={formData.paymentStatus} onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              {PAYMENT_OPTIONS.map((p) => (<option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" rows={3} placeholder="Optional notes..." />
          </div>
        </div>
      </CRUDModal>
    </div>
  )
}
