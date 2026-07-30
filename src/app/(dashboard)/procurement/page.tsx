"use client"

import React, { useEffect, useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, ShoppingCart, Search, Clock, Truck, Printer, Pencil, Trash2, Star, Send, CheckCircle, Package } from "lucide-react"
import { printDocument } from "@/lib/print"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Supplier {
  id: string
  name: string
  contactPerson: string | null
  email: string | null
  phone: string | null
  address: string | null
  category: string
  paymentTerms: string | null
  rating: string | null
  status: string
  poCount?: number
}

interface PurchaseOrder {
  id: string
  poNumber: string
  supplierName: string
  supplierId: string
  orderDate: string
  expectedDelivery: string | null
  totalAmount: string
  status: string
  itemCount: number
  items: { id: string; description: string | null; quantity: string; unitPrice: string; amount: string }[]
  createdAt: string
}

const defaultSupplierForm = {
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  category: "materials",
  paymentTerms: "",
  rating: "",
  status: "active",
}

const defaultPOForm = {
  supplierId: "",
  orderDate: "",
  expectedDelivery: "",
  totalAmount: "",
  items: [{ description: "", quantity: "1", unitPrice: "0", amount: "0" }],
}

const CATEGORY_OPTIONS = ["materials", "equipment", "services"]
const PO_STATUS_FLOW: Record<string, string[]> = {
  draft: ["pending"],
  pending: ["approved"],
  approved: ["received"],
}

export default function ProcurementPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"suppliers" | "orders">("orders")

  const [showSupplierModal, setShowSupplierModal] = useState(false)
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState(defaultSupplierForm)
  const [supplierSaving, setSupplierSaving] = useState(false)

  const [showPOModal, setShowPOModal] = useState(false)
  const [editPO, setEditPO] = useState<PurchaseOrder | null>(null)
  const [poForm, setPOForm] = useState(defaultPOForm)
  const [poSaving, setPOSaving] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch("/api/procurement")
      const data = await res.json()
      if (data.suppliers) setSuppliers(data.suppliers)
      if (data.purchaseOrders) setOrders(data.purchaseOrders)
    } catch { /* */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function fetchSuppliers() {
    try {
      const res = await fetch("/api/procurement/suppliers")
      const data = await res.json()
      if (Array.isArray(data)) setSuppliers(data)
    } catch { /* */ }
  }

  useEffect(() => {
    if (activeTab === "suppliers") fetchSuppliers()
  }, [activeTab])

  function openCreateSupplier() {
    setEditSupplier(null)
    setSupplierForm(defaultSupplierForm)
    setShowSupplierModal(true)
  }

  function openEditSupplier(s: Supplier) {
    setEditSupplier(s)
    setSupplierForm({
      name: s.name,
      contactPerson: s.contactPerson || "",
      email: s.email || "",
      phone: s.phone || "",
      address: s.address || "",
      category: s.category || "materials",
      paymentTerms: s.paymentTerms || "",
      rating: s.rating || "",
      status: s.status,
    })
    setShowSupplierModal(true)
  }

  async function handleSaveSupplier() {
    if (!supplierForm.name) {
      alert("Name is required")
      return
    }
    setSupplierSaving(true)
    try {
      const url = editSupplier ? `/api/procurement/suppliers/${editSupplier.id}` : "/api/procurement/suppliers"
      const method = editSupplier ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed")
      }
      setShowSupplierModal(false)
      setEditSupplier(null)
      fetchSuppliers()
      fetchData()
    } catch (err: any) {
      alert(err.message || "Error saving supplier")
    } finally {
      setSupplierSaving(false)
    }
  }

  async function handleDeleteSupplier(id: string) {
    if (!confirm("Are you sure you want to delete this supplier?")) return
    try {
      const res = await fetch(`/api/procurement/suppliers/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || "Error deleting supplier")
        return
      }
      fetchSuppliers()
      fetchData()
    } catch {
      alert("Error deleting supplier")
    }
  }

  function openCreatePO() {
    setEditPO(null)
    setPOForm(defaultPOForm)
    setShowPOModal(true)
  }

  function openEditPO(po: PurchaseOrder) {
    setEditPO(po)
    setPOForm({
      supplierId: po.supplierId,
      orderDate: po.orderDate ? new Date(po.orderDate).toISOString().split("T")[0] : "",
      expectedDelivery: po.expectedDelivery ? new Date(po.expectedDelivery).toISOString().split("T")[0] : "",
      totalAmount: po.totalAmount,
      items: po.items.length > 0
        ? po.items.map((i) => ({ description: i.description || "", quantity: i.quantity, unitPrice: i.unitPrice, amount: i.amount }))
        : [{ description: "", quantity: "1", unitPrice: "0", amount: "0" }],
    })
    setShowPOModal(true)
  }

  async function handleSavePO() {
    if (!poForm.supplierId) {
      alert("Supplier is required")
      return
    }
    setPOSaving(true)
    try {
      const url = editPO ? `/api/procurement/${editPO.id}` : "/api/procurement"
      const method = editPO ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...poForm,
          totalAmount: poForm.totalAmount ? Number(poForm.totalAmount) : 0,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      setShowPOModal(false)
      setEditPO(null)
      fetchData()
    } catch {
      alert("Error saving purchase order")
    } finally {
      setPOSaving(false)
    }
  }

  async function handleDeletePO(id: string) {
    if (!confirm("Are you sure you want to delete this purchase order?")) return
    try {
      const res = await fetch(`/api/procurement/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed")
      fetchData()
    } catch {
      alert("Error deleting purchase order")
    }
  }

  async function updatePOStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/procurement/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error("Failed")
      fetchData()
    } catch {
      alert("Error updating status")
    }
  }

  function addPOItem() {
    setPOForm({ ...poForm, items: [...poForm.items, { description: "", quantity: "1", unitPrice: "0", amount: "0" }] })
  }

  function removePOItem(index: number) {
    if (poForm.items.length <= 1) return
    setPOForm({ ...poForm, items: poForm.items.filter((_, i) => i !== index) })
  }

  function updatePOItem(index: number, field: string, value: string) {
    const items = [...poForm.items]
    items[index] = { ...items[index], [field]: value }
    if (field === "quantity" || field === "unitPrice") {
      const qty = parseFloat(items[index].quantity) || 0
      const price = parseFloat(items[index].unitPrice) || 0
      items[index].amount = String(qty * price)
    }
    const total = items.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0)
    setPOForm({ ...poForm, items, totalAmount: String(total) })
  }

  function printPO(order: PurchaseOrder) {
    const supplier = suppliers.find(s => s.id === order.supplierId)
    const itemsHTML = order.items.length > 0
      ? '<table><thead><tr><th>Description</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead><tbody>' +
        order.items.map(it =>
          '<tr><td>' + (it.description || "—") + '</td><td class="text-right mono">' + it.quantity + '</td><td class="text-right mono">' + formatCurrency(it.unitPrice) + '</td><td class="text-right mono">' + formatCurrency(it.amount) + '</td></tr>'
        ).join("") +
        '</tbody></table>'
      : "<p style='color:#94a3b8;'>No items</p>"

    const poNum = order.poNumber
    const orderDate = formatDate(order.orderDate)
    const status = order.status.charAt(0).toUpperCase() + order.status.slice(1)
    const sName = supplier?.name || order.supplierName
    const sContact = supplier?.contactPerson || ""
    const sEmail = supplier?.email || ""
    const sPhone = supplier?.phone || ""
    const sAddr = supplier?.address || ""
    const total = formatCurrency(order.totalAmount || "0")
    const delivery = order.expectedDelivery ? formatDate(order.expectedDelivery) : ""

    const content = [
      '<div style="display:flex;gap:40px;margin-bottom:20px;">',
      '<div style="flex:1;"><div class="section-label">Purchase Order</div>',
      '<p><strong>PO Number:</strong> <span class="mono">' + poNum + '</span></p>',
      '<p><strong>Order Date:</strong> ' + orderDate + '</p>',
      '<p><strong>Status:</strong> ' + status + '</p></div>',
      '<div style="flex:1;"><div class="section-label">Supplier Information</div>',
      '<p style="font-weight:600;">' + sName + '</p>',
      sContact ? '<p style="font-size:12px;color:#64748b;">Contact: ' + sContact + '</p>' : "",
      sEmail ? '<p style="font-size:12px;color:#64748b;">Email: ' + sEmail + '</p>' : "",
      sPhone ? '<p style="font-size:12px;color:#64748b;">Phone: ' + sPhone + '</p>' : "",
      sAddr ? '<p style="font-size:12px;color:#64748b;">Address: ' + sAddr + '</p>' : "",
      '</div></div>',
      '<div class="section"><div class="section-label">Order Items</div>' + itemsHTML + '</div>',
      '<div class="totals"><table class="totals-table"><tr><td>Total</td><td class="text-right mono" style="font-weight:700;font-size:18px;">' + total + '</td></tr></table></div>',
      delivery ? '<div class="section" style="margin-top:20px;"><div class="section-label">Delivery</div><p><strong>Expected Delivery:</strong> ' + delivery + '</p></div>' : "",
      '<div class="section" style="margin-top:20px;"><div class="section-label">Authorization</div>',
      '<p>Authorized by: ____________________________</p>',
      '<p style="margin-top:8px;">Date: ' + orderDate + '</p></div>',
    ].join("\n")
    printDocument({ title: "Purchase Order " + poNum, content })
  }

  const filteredOrders = orders.filter((o) =>
    (o.poNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.supplierName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (o.status || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredSuppliers = suppliers.filter((s) =>
    (s.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.contactPerson || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalSpend = orders.reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0)
  const pendingOrders = orders.filter((o) => o.status === "draft" || o.status === "pending")
  const activeSuppliers = suppliers.filter((s) => s.status === "active")

  const stats = [
    { label: "Total Suppliers", value: suppliers.length, icon: ShoppingCart, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Suppliers", value: activeSuppliers.length, icon: Truck, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Total PO Value", value: formatCurrency(totalSpend), icon: ShoppingCart, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Pending Approvals", value: pendingOrders.length, icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
  ]

  const supplierColumns: Column<Supplier>[] = [
    { key: "name", header: "Name", render: (s) => <span className="font-medium text-slate-900">{s.name}</span> },
    { key: "contactPerson", header: "Contact", render: (s) => <span className="text-sm text-slate-700">{s.contactPerson || "—"}</span> },
    { key: "email", header: "Email", render: (s) => <span className="text-sm text-slate-500">{s.email || "—"}</span> },
    { key: "phone", header: "Phone", render: (s) => <span className="text-sm text-slate-500">{s.phone || "—"}</span> },
    { key: "category", header: "Category", render: (s) => <Badge variant="secondary">{s.category}</Badge> },
    { key: "paymentTerms", header: "Payment Terms", render: (s) => <span className="text-sm text-slate-500">{s.paymentTerms || "—"}</span> },
    {
      key: "rating", header: "Rating",
      render: (s) => s.rating ? (
        <div className="flex items-center gap-1">
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span className="text-sm font-medium text-slate-700">{s.rating}/5</span>
        </div>
      ) : <span className="text-sm text-slate-400">—</span>,
    },
    {
      key: "status", header: "Status",
      render: (s) => <Badge variant={s.status === "active" ? "success" : "secondary"}>{s.status}</Badge>,
    },
    {
      key: "actions", header: "Actions",
      render: (s) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEditSupplier(s)} className="p-1.5 hover:bg-slate-100 rounded" title="Edit"><Pencil className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => handleDeleteSupplier(s.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete"><Trash2 className="h-4 w-4 text-red-400" /></button>
        </div>
      ),
    },
  ]

  const poColumns: Column<PurchaseOrder>[] = [
    { key: "poNumber", header: "PO Number", render: (o) => <span className="font-medium text-slate-900">{o.poNumber}</span> },
    { key: "supplierName", header: "Supplier", render: (o) => <span className="text-sm text-slate-700">{o.supplierName}</span> },
    { key: "itemCount", header: "Items", render: (o) => <span className="text-sm text-slate-500">{o.itemCount} items</span> },
    { key: "totalAmount", header: "Amount", render: (o) => <span className="font-bold text-slate-900">{formatCurrency(o.totalAmount)}</span> },
    { key: "orderDate", header: "Order Date", render: (o) => <span className="text-sm text-slate-500">{formatDate(o.orderDate)}</span> },
    {
      key: "status", header: "Status",
      render: (o) => (
        <Badge variant={o.status === "received" || o.status === "approved" ? "success" : o.status === "draft" || o.status === "pending" ? "warning" : "default"}>
          {o.status}
        </Badge>
      ),
    },
    {
      key: "actions", header: "Actions",
      render: (o) => {
        const nextStatuses = PO_STATUS_FLOW[o.status] || []
        return (
          <div className="flex items-center gap-1">
            {nextStatuses.includes("pending") && (
              <button onClick={() => updatePOStatus(o.id, "pending")} className="p-1.5 hover:bg-blue-50 rounded" title="Submit for Approval"><Send className="h-4 w-4 text-blue-500" /></button>
            )}
            {nextStatuses.includes("approved") && (
              <button onClick={() => updatePOStatus(o.id, "approved")} className="p-1.5 hover:bg-emerald-50 rounded" title="Approve"><CheckCircle className="h-4 w-4 text-emerald-500" /></button>
            )}
            {nextStatuses.includes("received") && (
              <button onClick={() => updatePOStatus(o.id, "received")} className="p-1.5 hover:bg-purple-50 rounded" title="Mark Received"><Package className="h-4 w-4 text-purple-500" /></button>
            )}
            <button onClick={() => openEditPO(o)} className="p-1.5 hover:bg-slate-100 rounded" title="Edit"><Pencil className="h-4 w-4 text-slate-500" /></button>
            <button onClick={() => printPO(o)} className="p-1.5 hover:bg-slate-100 rounded" title="Print PO"><Printer className="h-4 w-4 text-slate-500" /></button>
            <button onClick={() => handleDeletePO(o.id)} className="p-1.5 hover:bg-red-50 rounded" title="Delete"><Trash2 className="h-4 w-4 text-red-400" /></button>
          </div>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Procurement"
        description="Manage suppliers and purchase orders"
        action={
          activeTab === "suppliers"
            ? <Button onClick={openCreateSupplier}><Plus className="h-4 w-4 mr-2" />New Supplier</Button>
            : <Button onClick={openCreatePO}><Plus className="h-4 w-4 mr-2" />New Purchase Order</Button>
        }
      />

      <StatsGrid stats={stats} />

      <div className="flex items-center gap-1 border-b border-slate-200 mb-2">
        <button
          onClick={() => { setActiveTab("suppliers"); setSearchQuery("") }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "suppliers" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Suppliers ({suppliers.length})
        </button>
        <button
          onClick={() => { setActiveTab("orders"); setSearchQuery("") }}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === "orders" ? "border-orange-500 text-orange-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}
        >
          Purchase Orders ({orders.length})
        </button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{activeTab === "suppliers" ? "Suppliers" : "Purchase Orders"}</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder={`Search ${activeTab}...`} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400" />
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === "suppliers" ? (
            <DataTable columns={supplierColumns} data={filteredSuppliers} loading={loading} emptyMessage="No suppliers yet. Add your first supplier!" loadingMessage="Loading suppliers..." />
          ) : (
            <DataTable columns={poColumns} data={filteredOrders} loading={loading} emptyMessage="No purchase orders yet." loadingMessage="Loading orders..." />
          )}
        </CardContent>
      </Card>

      <CRUDModal
        open={showSupplierModal}
        onClose={() => { setShowSupplierModal(false); setEditSupplier(null) }}
        title={editSupplier ? `Edit Supplier - ${editSupplier.name}` : "New Supplier"}
        onSave={handleSaveSupplier}
        saving={supplierSaving}
        saveLabel={editSupplier ? "Update Supplier" : "Create Supplier"}
        disabled={!supplierForm.name}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Company Name *</label>
            <input type="text" value={supplierForm.name} onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Supplier name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
            <input type="text" value={supplierForm.contactPerson} onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Contact person" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select value={supplierForm.category} onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              {CATEGORY_OPTIONS.map((c) => (<option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="email@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input type="text" value={supplierForm.phone} onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="+1 (555) 000-0000" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input type="text" value={supplierForm.address} onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Full address" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Terms</label>
            <input type="text" value={supplierForm.paymentTerms} onChange={(e) => setSupplierForm({ ...supplierForm, paymentTerms: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Net 30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rating (1-5)</label>
            <input type="number" min="1" max="5" step="0.5" value={supplierForm.rating} onChange={(e) => setSupplierForm({ ...supplierForm, rating: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="1-5" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={supplierForm.status} onChange={(e) => setSupplierForm({ ...supplierForm, status: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </CRUDModal>

      <CRUDModal
        open={showPOModal}
        onClose={() => { setShowPOModal(false); setEditPO(null) }}
        title={editPO ? `Edit ${editPO.poNumber}` : "New Purchase Order"}
        onSave={handleSavePO}
        saving={poSaving}
        saveLabel={editPO ? "Update PO" : "Create PO"}
        disabled={!poForm.supplierId}
        maxWidth="max-w-3xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
            <select value={poForm.supplierId} onChange={(e) => setPOForm({ ...poForm, supplierId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select supplier</option>
              {suppliers.filter((s) => s.status === "active").map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount</label>
            <input type="number" value={poForm.totalAmount} readOnly className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Order Date</label>
            <input type="date" value={poForm.orderDate} onChange={(e) => setPOForm({ ...poForm, orderDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Expected Delivery</label>
            <input type="date" value={poForm.expectedDelivery} onChange={(e) => setPOForm({ ...poForm, expectedDelivery: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-semibold text-slate-700">Order Items</label>
            <button type="button" onClick={addPOItem} className="text-sm text-orange-600 hover:text-orange-700 font-medium">+ Add Item</button>
          </div>
          {poForm.items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-12 gap-2 mb-2 items-end">
              <div className="col-span-5">
                {idx === 0 && <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>}
                <input type="text" value={item.description} onChange={(e) => updatePOItem(idx, "description", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Item description" />
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>}
                <input type="number" value={item.quantity} onChange={(e) => updatePOItem(idx, "quantity", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" min="0" />
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="block text-xs font-medium text-slate-500 mb-1">Unit Price</label>}
                <input type="number" value={item.unitPrice} onChange={(e) => updatePOItem(idx, "unitPrice", e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" min="0" />
              </div>
              <div className="col-span-2">
                {idx === 0 && <label className="block text-xs font-medium text-slate-500 mb-1">Amount</label>}
                <input type="text" value={formatCurrency(item.amount || "0")} readOnly className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-slate-50 text-slate-600" />
              </div>
              <div className="col-span-1 flex justify-center">
                {idx === 0 && <label className="block text-xs font-medium text-transparent mb-1 select-none">&nbsp;</label>}
                <button type="button" onClick={() => removePOItem(idx)} disabled={poForm.items.length <= 1} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-30">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </CRUDModal>
    </div>
  )
}
