"use client"

import React, { use, useCallback, useEffect, useState } from "react"
import { useCrud } from "@/hooks/use-crud"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ArrowUpRight, ArrowDownRight, Search, Trash2, CreditCard, DollarSign, Printer, Download, Pencil } from "lucide-react"
import { useToast } from "@/components/dashboard/toast"
import { printDocument } from "@/lib/print"
import { exportToCSV } from "@/lib/export-csv"
import { exportToPdf } from "@/lib/pdf-export"
import { generateReceiptPDF } from "@/lib/pdf-generator"
import { formatCurrency, formatDate, toNum } from "@/lib/utils"

interface InvoiceSummary {
  id: string
  invoiceNumber: string
  totalAmount: string
  paidAmount: string
  status: string
}

interface Payment {
  id: string
  paymentNumber: string
  type: string
  contactId: string
  contactName: string
  invoiceId: string | null
  amount: string
  paymentMethod: string
  paymentDate: string
  invoice: { invoiceNumber: string; totalAmount: string } | null
}

const defaultForm = {
  type: "received",
  contactId: "",
  invoiceId: "",
  amount: "",
  paymentMethod: "bank_transfer",
  paymentDate: "",
}

function methodLabel(m: string) {
  return m.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
}

function printReceipt(p: Payment) {
  const content = `
    <div style="max-width:500px;margin:0 auto;">
      <div style="text-align:center;margin-bottom:24px;"><p style="font-size:32px;font-weight:700;color:#16a34a;">PAYMENT RECEIPT</p><p style="color:#64748b;">Receipt # ${p.paymentNumber}</p></div>
      <table style="width:100%;margin-bottom:20px;">
        <tr><td style="padding:8px 0;color:#64748b;width:40%;">Receipt Number</td><td style="padding:8px 0;font-weight:600;" class="mono">${p.paymentNumber}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Date</td><td style="padding:8px 0;" class="mono">${formatDate(p.paymentDate)}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Received From</td><td style="padding:8px 0;font-weight:600;">${p.contactName}</td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Type</td><td style="padding:8px 0;"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;${p.type === "received" ? "background:#dcfce7;color:#16a34a;" : "background:#fee2e2;color:#dc2626;"}">${p.type === "received" ? "Payment Received" : "Payment Made"}</span></td></tr>
        <tr><td style="padding:8px 0;color:#64748b;">Payment Method</td><td style="padding:8px 0;">${methodLabel(p.paymentMethod)}</td></tr>
        ${p.invoice ? `<tr><td style="padding:8px 0;color:#64748b;">Related Invoice</td><td style="padding:8px 0;" class="mono">${p.invoice.invoiceNumber}</td></tr>` : ""}
      </table>
      <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:8px;padding:20px;text-align:center;margin:24px 0;">
        <p style="font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:1px;">Amount</p>
        <p style="font-size:36px;font-weight:700;color:#16a34a;" class="mono">${p.type === "received" ? "+" : "-"}${formatCurrency(p.amount)}</p>
      </div>
      <div class="thank-you">Thank you for your payment! If you have questions about this receipt, please contact us.</div>
    </div>`
  printDocument({ title: `Receipt ${p.paymentNumber}`, content })
}

function downloadReceipt(p: Payment) {
  generateReceiptPDF(p, "BuildProp")
}

export default function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const [search, setSearch] = useState("")
  const [contacts, setContacts] = useState<any[]>([])
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetch("/api/contacts").then(r => r.json()).then(setContacts).catch(() => {})
    fetch("/api/invoices").then(r => r.json()).then((data) => {
      setInvoices(data.map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        status: inv.status,
      })))
    }).catch(() => {})
  }, [])

  const {
    data: payments, loading, showModal, setShowModal,
    editingItem, setEditingItem, formData, setFormData, saving, handleSave, handleDelete,
  } = useCrud<Payment>({
    apiPath: "/api/payments",
    defaultForm,
    transformBody: (form) => ({
      type: form.type,
      contactId: form.contactId,
      invoiceId: form.invoiceId || null,
      amount: toNum(form.amount),
      paymentMethod: form.paymentMethod,
      paymentDate: form.paymentDate,
    }),
    onSuccess: (action) => {
      if (action === "save") {
        toast({ title: "Success", description: editingItem ? "Payment updated successfully" : "Payment recorded successfully", variant: "success" })
      } else {
        toast({ title: "Success", description: "Payment deleted successfully", variant: "success" })
      }
    },
  })

  const openCreate = useCallback(() => {
    setEditingItem(null)
    setFormData(defaultForm)
    setShowModal(true)
  }, [setEditingItem, setFormData, setShowModal])

  const params = use(searchParams)

  useEffect(() => {
    if (params.new === "1") openCreate()
  }, [params, openCreate])

  function openEdit(p: Payment) {
    setEditingItem(p)
    setFormData({
      type: p.type,
      contactId: p.contactId,
      invoiceId: p.invoiceId || "",
      amount: p.amount || "",
      paymentMethod: p.paymentMethod,
      paymentDate: p.paymentDate ? p.paymentDate.split("T")[0] : "",
    })
    setShowModal(true)
  }

  function handleInvoiceSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const invId = e.target.value
    if (invId) {
      const inv = invoices.find(i => i.id === invId)
      if (inv) {
        const remaining = toNum(inv.totalAmount) - toNum(inv.paidAmount)
        setFormData({ ...formData, invoiceId: invId, amount: remaining > 0 ? remaining.toString() : "" })
        return
      }
    }
    setFormData({ ...formData, invoiceId: invId })
  }

  const filtered = payments.filter((p: Payment) =>
    p.paymentNumber.toLowerCase().includes(search.toLowerCase()) ||
    p.contactName.toLowerCase().includes(search.toLowerCase())
  )

  const totalReceived = payments.filter((p: Payment) => p.type === "received").reduce((s: number, p: Payment) => s + toNum(p.amount), 0)
  const totalMade = payments.filter((p: Payment) => p.type === "made").reduce((s: number, p: Payment) => s + toNum(p.amount), 0)
  const netFlow = totalReceived - totalMade

  const stats = [
    { label: "Total Received", value: formatCurrency(totalReceived), icon: ArrowUpRight, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Total Made", value: formatCurrency(totalMade), icon: ArrowDownRight, color: "text-red-500", bg: "bg-red-50" },
    { label: "Net Flow", value: formatCurrency(netFlow), icon: DollarSign, color: netFlow >= 0 ? "text-emerald-500" : "text-red-500", bg: netFlow >= 0 ? "bg-emerald-50" : "bg-red-50" },
    { label: "Transactions", value: payments.length.toString(), icon: CreditCard, color: "text-blue-500", bg: "bg-blue-50" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payments"
        description="Track all incoming and outgoing payments"
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => exportToCSV(filtered.map((p: Payment) => ({
              "Payment #": p.paymentNumber, Type: p.type, Contact: p.contactName,
              Amount: p.amount, Method: p.paymentMethod, Date: p.paymentDate, "Invoice #": p.invoice?.invoiceNumber || "",
            })), "payments.csv")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Button variant="outline" onClick={() => exportToPdf({
              title: "Payments", subtitle: `${filtered.length} payment${filtered.length !== 1 ? "s" : ""}`,
              headers: ["Payment #", "Type", "Contact", "Amount", "Method", "Date"],
              rows: filtered.map((p: Payment) => [p.paymentNumber, p.type === "received" ? "Received" : "Made", p.contactName, `${p.type === "received" ? "+" : "-"}${formatCurrency(p.amount)}`, methodLabel(p.paymentMethod), formatDate(p.paymentDate)]),
              filename: "payments.pdf",
            })}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
          </div>
        }
      />

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Payment History</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search payments..." value={search} onChange={e => setSearch(e.target.value)} className="rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400" />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Loading payments..." />
          ) : filtered.length === 0 ? (
            <EmptyState message="No payments yet. Record your first payment!" />
          ) : (
            <div className="space-y-3">
              {filtered.map((p: Payment) => (
                <div key={p.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${p.type === "received" ? "bg-emerald-50" : "bg-red-50"}`}>
                    {p.type === "received" ? <ArrowUpRight className="h-5 w-5 text-emerald-500" /> : <ArrowDownRight className="h-5 w-5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{p.paymentNumber}</p>
                      <Badge variant={p.type === "received" ? "success" : "destructive"}>{p.type === "received" ? "Received" : "Made"}</Badge>
                      {p.invoice && (
                        <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">{p.invoice.invoiceNumber}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                      <span>{p.contactName}</span><span>•</span>
                      <span>{methodLabel(p.paymentMethod)}</span><span>•</span>
                      <span>{formatDate(p.paymentDate)}</span>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <p className={`text-lg font-bold ${p.type === "received" ? "text-emerald-600" : "text-red-600"}`}>
                      {p.type === "received" ? "+" : "-"}{formatCurrency(p.amount)}
                    </p>
                    <button onClick={() => openEdit(p)} className="p-2 hover:bg-slate-100 rounded-lg" title="Edit"><Pencil className="h-4 w-4 text-slate-500" /></button>
                    <button onClick={() => printReceipt(p)} className="p-2 hover:bg-slate-100 rounded-lg" title="Print Receipt"><Printer className="h-4 w-4 text-slate-500" /></button>
                    <button onClick={() => downloadReceipt(p)} className="p-2 hover:bg-slate-100 rounded-lg" title="Download Receipt"><Download className="h-4 w-4 text-slate-500" /></button>
                    <button onClick={() => handleDelete(p.id)} className="p-2 hover:bg-slate-100 rounded-lg" title="Delete"><Trash2 className="h-4 w-4 text-red-500" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CRUDModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? "Edit Payment" : "Record Payment"}
        onSave={handleSave}
        saving={saving}
        disabled={!formData.contactId || !formData.amount || !formData.paymentDate}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="received">Received</option>
              <option value="made">Made</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact *</label>
            <select value={formData.contactId || ""} onChange={(e) => setFormData({ ...formData, contactId: e.target.value })} className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select a contact...</option>
              {contacts.map((c: any) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName} ({c.email || 'No email'})</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Invoice (optional)</label>
            <select value={formData.invoiceId || ""} onChange={handleInvoiceSelect} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">No invoice</option>
              {invoices.filter(inv => inv.status !== "paid").map(inv => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoiceNumber} — {formatCurrency(inv.totalAmount)} ({inv.status})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
            <input type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method *</label>
            <select value={formData.paymentMethod} onChange={e => setFormData({...formData, paymentMethod: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
            <input type="date" value={formData.paymentDate} onChange={e => setFormData({...formData, paymentDate: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      </CRUDModal>
    </div>
  )
}
