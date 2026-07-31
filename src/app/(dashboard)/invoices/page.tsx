"use client"

import React, { useEffect, useState } from "react"
import { useCrud } from "@/hooks/use-crud"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, FileText, Search, Trash2, Printer, Download, Pencil, X } from "lucide-react"
import { useToast } from "@/components/dashboard/toast"
import { printDocument } from "@/lib/print"
import { exportToCSV } from "@/lib/export-csv"
import { exportToPdf } from "@/lib/pdf-export"
import { generateInvoicePDF } from "@/lib/pdf-generator"
import { formatCurrency, formatDate, statusVariant, statusLabel, toNum } from "@/lib/utils"

interface InvoiceItem {
  id: string
  description: string
  quantity: string
  unitPrice: string
  amount: string
}

interface Invoice {
  id: string
  invoiceNumber: string
  type: string
  contactId: string
  contactName: string
  issueDate: string
  dueDate: string
  subtotal: string
  taxAmount: string
  totalAmount: string
  paidAmount: string
  status: string
  items: InvoiceItem[]
}

interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

const defaultForm = {
  type: "sales",
  contactId: "",
  issueDate: "",
  dueDate: "",
}

export default function InvoicesPage() {
  const [search, setSearch] = useState("")
  const [contacts, setContacts] = useState<any[]>([])
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: "", quantity: 1, unitPrice: 0 },
  ])
  const { toast } = useToast()

  useEffect(() => {
    fetch("/api/contacts").then(r => r.json()).then(setContacts).catch(() => {})
  }, [])

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const taxAmount = subtotal * 0.15
  const totalAmount = subtotal + taxAmount

  function addItem() {
    setLineItems([...lineItems, { description: "", quantity: 1, unitPrice: 0 }])
  }

  function removeItem(index: number) {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index))
    }
  }

  function updateItem(index: number, field: keyof LineItem, value: string | number) {
    const updated = [...lineItems]
    if (field === "description") updated[index].description = value as string
    else if (field === "quantity") updated[index].quantity = Number(value) || 0
    else if (field === "unitPrice") updated[index].unitPrice = Number(value) || 0
    setLineItems(updated)
  }

  const {
    data: invoices, loading, showModal, setShowModal,
    editingItem, setEditingItem, formData, setFormData, saving, handleSave, handleDelete,
  } = useCrud<Invoice>({
    apiPath: "/api/invoices",
    defaultForm,
    transformBody: (form) => {
      const bodyItems = lineItems
        .filter(item => item.description.trim() !== "")
        .map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: item.quantity * item.unitPrice,
        }))

      const items = bodyItems.length > 0 ? bodyItems : [{
        description: "Invoice total",
        quantity: 1,
        unitPrice: totalAmount,
        amount: totalAmount,
      }]

      return {
        type: form.type,
        contactId: form.contactId,
        issueDate: form.issueDate,
        dueDate: form.dueDate,
        subtotal,
        taxAmount,
        totalAmount,
        items,
      }
    },
    onSuccess: (action) => {
      if (action === "save") {
        toast({ title: "Success", description: editingItem ? "Invoice updated successfully" : "Invoice created successfully", variant: "success" })
      } else {
        toast({ title: "Success", description: "Invoice deleted successfully", variant: "success" })
      }
    },
  })

  function openCreate() {
    setEditingItem(null)
    setFormData(defaultForm)
    setLineItems([{ description: "", quantity: 1, unitPrice: 0 }])
    setShowModal(true)
  }

  function openEdit(inv: Invoice) {
    setEditingItem(inv)
    setFormData({
      type: inv.type,
      contactId: inv.contactId,
      issueDate: inv.issueDate ? inv.issueDate.split("T")[0] : "",
      dueDate: inv.dueDate ? inv.dueDate.split("T")[0] : "",
    })
    if (inv.items && inv.items.length > 0) {
      setLineItems(inv.items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity) || 1,
        unitPrice: parseFloat(item.unitPrice) || 0,
      })))
    } else {
      setLineItems([{ description: "", quantity: 1, unitPrice: 0 }])
    }
    setShowModal(true)
  }

  const filtered = invoices.filter((inv: Invoice) =>
    inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
    inv.contactName.toLowerCase().includes(search.toLowerCase())
  )

  const totalInvoiced = invoices.reduce((s: number, i: Invoice) => s + toNum(i.totalAmount), 0)
  const totalPaid = invoices.reduce((s: number, i: Invoice) => s + toNum(i.paidAmount), 0)
  const totalPending = invoices.filter((i: Invoice) => i.status === "pending").reduce((s: number, i: Invoice) => s + toNum(i.totalAmount) - toNum(i.paidAmount), 0)
  const totalOverdue = invoices.filter((i: Invoice) => i.status === "overdue").reduce((s: number, i: Invoice) => s + toNum(i.totalAmount) - toNum(i.paidAmount), 0)

  const stats = [
    { label: "Total Invoiced", value: formatCurrency(totalInvoiced), color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Paid", value: formatCurrency(totalPaid), color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Pending", value: formatCurrency(totalPending), color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Overdue", value: formatCurrency(totalOverdue), color: "text-red-500", bg: "bg-red-50" },
  ]

  function printInvoice(inv: Invoice) {
    const items = inv.items || []
    const itemRows = items.length > 0
      ? items.map((it, idx) => `<tr><td>${idx + 1}</td><td>${it.description}</td><td class="text-right mono">${parseFloat(it.quantity).toLocaleString()}</td><td class="text-right mono">${formatCurrency(it.unitPrice)}</td><td class="text-right mono">${formatCurrency(it.amount)}</td></tr>`).join("")
      : "<tr><td colspan='5' style='color:#94a3b8;text-align:center;'>No line items</td></tr>"

    const content = `
      <div style="display:flex;gap:40px;margin-bottom:20px;">
        <div style="flex:1;"><div class="section-label">Invoice Details</div><p><strong>Invoice #:</strong> ${inv.invoiceNumber}</p><p><strong>Type:</strong> ${inv.type.charAt(0).toUpperCase() + inv.type.slice(1)}</p><p><strong>Issue Date:</strong> ${formatDate(inv.issueDate)}</p><p><strong>Due Date:</strong> ${formatDate(inv.dueDate)}</p></div>
        <div style="flex:1;"><div class="section-label">Bill To</div><p>${inv.contactName}</p><p style="font-size:12px;color:#64748b;">Contact ID: ${inv.contactId}</p></div>
      </div>
      <div class="section"><div class="section-label">Line Items</div>
      <table><thead><tr><th>#</th><th>Description</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead><tbody>${itemRows}</tbody></table></div>
      <div class="totals"><table class="totals-table">
        <tr><td>Subtotal</td><td class="text-right mono">${formatCurrency(inv.subtotal)}</td></tr>
        <tr><td>VAT 15%</td><td class="text-right mono">${formatCurrency(inv.taxAmount)}</td></tr>
        <tr class="total-row"><td>Total</td><td class="text-right mono">${formatCurrency(inv.totalAmount)}</td></tr>
        <tr><td>Paid</td><td class="text-right mono">${formatCurrency(inv.paidAmount)}</td></tr>
        <tr><td>Balance Due</td><td class="text-right mono" style="color:#dc2626;">${formatCurrency(toNum(inv.totalAmount) - toNum(inv.paidAmount))}</td></tr>
      </table></div>
      <div class="section" style="margin-top:20px;"><div class="section-label">Payment Terms</div><p style="font-size:12px;color:#64748b;">Payment is due by ${formatDate(inv.dueDate)}. Please reference invoice number ${inv.invoiceNumber} on your payment.</p></div>
      <div class="thank-you">Thank you for your business!</div>`
    printDocument({ title: `Invoice ${inv.invoiceNumber}`, content })
  }

  function downloadInvoicePDF(inv: Invoice) {
    generateInvoicePDF(inv, inv.items || [], "BuildProp")
  }

  const columns: Column<Invoice>[] = [
    {
      key: "invoiceNumber", header: "Invoice",
      render: (inv) => (
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-400" />
          <span className="font-medium text-slate-900">{inv.invoiceNumber}</span>
        </div>
      ),
    },
    { key: "contactName", header: "Client", render: (inv) => <span className="text-sm text-slate-700">{inv.contactName}</span> },
    { key: "totalAmount", header: "Amount", render: (inv) => <span className="font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</span> },
    { key: "issueDate", header: "Date", render: (inv) => <span className="text-sm text-slate-500">{formatDate(inv.issueDate)}</span> },
    { key: "dueDate", header: "Due", render: (inv) => <span className="text-sm text-slate-500">{formatDate(inv.dueDate)}</span> },
    {
      key: "status", header: "Status",
      render: (inv) => <Badge variant={statusVariant(inv.status) as any}>{statusLabel(inv.status)}</Badge>,
    },
    {
      key: "actions", header: "Actions",
      render: (inv) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(inv)} className="p-1.5 hover:bg-slate-100 rounded" title="Edit"><Pencil className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => printInvoice(inv)} className="p-1.5 hover:bg-slate-100 rounded" title="Print"><Printer className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => downloadInvoicePDF(inv)} className="p-1.5 hover:bg-slate-100 rounded" title="Download PDF"><Download className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => handleDelete(inv.id)} className="p-1.5 hover:bg-slate-100 rounded" title="Delete"><Trash2 className="h-4 w-4 text-red-500" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices"
        description="Manage sales and purchase invoices"
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => exportToCSV(filtered.map((inv: Invoice) => ({
              "Invoice #": inv.invoiceNumber, Type: inv.type, Client: inv.contactName,
              "Issue Date": inv.issueDate, "Due Date": inv.dueDate, Subtotal: inv.subtotal,
              Tax: inv.taxAmount, Total: inv.totalAmount, Paid: inv.paidAmount, Status: inv.status,
            })), "invoices.csv")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Button variant="outline" onClick={() => exportToPdf({
              title: "Invoices", subtitle: `${filtered.length} invoice${filtered.length !== 1 ? "s" : ""}`,
              headers: ["Invoice #", "Client", "Type", "Amount", "Paid", "Status", "Due Date"],
              rows: filtered.map((inv: Invoice) => [inv.invoiceNumber, inv.contactName, inv.type.charAt(0).toUpperCase() + inv.type.slice(1), formatCurrency(inv.totalAmount), formatCurrency(inv.paidAmount), statusLabel(inv.status), formatDate(inv.dueDate)]),
              filename: "invoices.pdf",
            })}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Create Invoice</Button>
          </div>
        }
      />

      <StatsGrid stats={stats} />

      {loading ? (
        <LoadingState message="Loading invoices..." />
      ) : (
        <div className="flex items-center justify-between mb-0">
          <div className="relative ml-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} className="rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      )}

      {filtered.length === 0 && !loading ? (
        <EmptyState message="No invoices yet. Create your first invoice!" />
      ) : !loading ? (
        <DataTable columns={columns} data={filtered} loading={loading} />
      ) : null}

      <CRUDModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? "Edit Invoice" : "New Invoice"}
        onSave={handleSave}
        saving={saving}
        disabled={!formData.contactId || !formData.issueDate || !formData.dueDate}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="sales">Sales</option>
              <option value="rental">Rental</option>
              <option value="service">Service</option>
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
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date *</label>
            <input type="date" value={formData.issueDate} onChange={e => setFormData({...formData, issueDate: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date *</label>
            <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-slate-700">Line Items</p>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    placeholder="Description"
                    value={item.description}
                    onChange={e => updateItem(i, "description", e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity || ""}
                    onChange={e => updateItem(i, "quantity", e.target.value)}
                    className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.unitPrice || ""}
                    onChange={e => updateItem(i, "unitPrice", e.target.value)}
                    className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  />
                  <span className="w-28 text-right text-sm font-medium text-slate-900">{formatCurrency(item.quantity * item.unitPrice)}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(i)}
                    disabled={lineItems.length <= 1}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-slate-200 pt-3 space-y-1.5">
              <div className="flex justify-between text-sm text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-slate-600">
                <span>VAT (15%)</span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Total</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          </div>
        </div>
      </CRUDModal>
    </div>
  )
}
