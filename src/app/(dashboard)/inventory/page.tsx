"use client"

import React, { useEffect, useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useToast, ToastContainer } from "@/components/dashboard/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Package, AlertTriangle, Warehouse, ArrowUpDown, Download, Plus, Pencil, Trash2 } from "lucide-react"
import { exportToCSV } from "@/lib/export-csv"
import { toNum, formatCurrency } from "@/lib/utils"

interface WarehouseStock {
  id: string
  warehouseId: string
  warehouse: { id: string; name: string }
  quantity: string
}

interface InventoryItem {
  id: string
  sku: string
  name: string
  description: string | null
  categoryName: string
  unitOfMeasure: string
  minStock: string
  maxStock: string
  currentStock: string
  unitCost: string
  warehouseStock: WarehouseStock[]
}

function stockStatus(current: number, min: number) {
  if (current <= 0) return "Out of Stock"
  if (current < min) return "Low Stock"
  return "In Stock"
}

function stockVariant(s: string) {
  if (s === "In Stock") return "success"
  if (s === "Low Stock") return "warning"
  return "destructive"
}

const emptyForm = {
  name: "",
  description: "",
  unitOfMeasure: "pcs",
  minStock: "0",
  maxStock: "100",
  currentStock: "0",
  unitCost: "0",
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  function fetchItems() {
    setLoading(true)
    fetch("/api/inventory").then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d) }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchItems() }, [])

  const inStockCount = items.filter(i => stockStatus(toNum(i.currentStock), toNum(i.minStock)) === "In Stock").length
  const lowStockCount = items.filter(i => stockStatus(toNum(i.currentStock), toNum(i.minStock)) === "Low Stock").length
  const outOfStockCount = items.filter(i => stockStatus(toNum(i.currentStock), toNum(i.minStock)) === "Out of Stock").length
  const warehouseCount = new Set(items.flatMap(i => i.warehouseStock.map(ws => ws.warehouseId))).size

  function openAdd() { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(item: InventoryItem) {
    setEditingId(item.id)
    setForm({
      name: item.name,
      description: item.description || "",
      unitOfMeasure: item.unitOfMeasure,
      minStock: item.minStock,
      maxStock: item.maxStock,
      currentStock: item.currentStock,
      unitCost: item.unitCost,
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const url = editingId ? `/api/inventory/${editingId}` : "/api/inventory"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast(editingId ? "Item updated." : "Item added.")
        setShowModal(false)
        setForm(emptyForm)
        setEditingId(null)
        fetchItems()
      } else {
        toast({ title: "Failed to save item.", variant: "error" })
      }
    } catch {
      toast({ title: "Failed to save item.", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this inventory item?")) return
    try {
      await fetch(`/api/inventory/${id}`, { method: "DELETE" })
      toast({ title: "Item removed.", variant: "info" })
      fetchItems()
    } catch {
      toast({ title: "Failed to delete item.", variant: "error" })
    }
  }

  const stats = [
    { label: "Total Items", value: items.length.toLocaleString(), icon: Package, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "In Stock", value: inStockCount.toString(), icon: Package, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Low Stock", value: lowStockCount.toString(), icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
    { label: "Warehouses", value: warehouseCount.toString(), icon: Warehouse, color: "text-orange-500", bg: "bg-orange-50" },
  ]

  const columns: Column<InventoryItem>[] = [
    { key: "name", header: "Item", render: (item) => <span className="font-medium text-slate-900">{item.name}</span> },
    { key: "sku", header: "SKU", render: (item) => <span className="text-sm text-slate-500">{item.sku}</span> },
    { key: "categoryName", header: "Category", render: (item) => <span className="text-sm text-slate-500">{item.categoryName || "\u2014"}</span> },
    {
      key: "currentStock", header: "Stock Level",
      render: (item) => {
        const current = toNum(item.currentStock)
        const min = toNum(item.minStock)
        const max = toNum(item.maxStock) || 100
        const status = stockStatus(current, min)
        const pct = Math.min((current / max) * 100, 100)
        return (
          <div className="flex items-center gap-2">
            <span className={`font-medium ${status === "Low Stock" || status === "Out of Stock" ? "text-red-600" : "text-slate-900"}`}>
              {current.toLocaleString()} {item.unitOfMeasure}
            </span>
            <div className="w-20 bg-slate-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${status === "Out of Stock" ? "bg-red-500" : status === "Low Stock" ? "bg-orange-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
    { key: "unitCost", header: "Unit Cost", render: (item) => <span className="text-sm text-slate-700">{formatCurrency(toNum(item.unitCost))}</span> },
    {
      key: "status", header: "Status",
      render: (item) => {
        const status = stockStatus(toNum(item.currentStock), toNum(item.minStock))
        return <Badge variant={stockVariant(status) as any}>{status}</Badge>
      },
    },
    {
      key: "id", header: "Actions",
      render: (item) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(item)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => handleDelete(item.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory Management"
        description="Track building materials and supplies"
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => exportToCSV(items.map(item => ({
              Name: item.name, SKU: item.sku, Category: item.categoryName || "",
              "Unit of Measure": item.unitOfMeasure, "Min Stock": item.minStock,
              "Max Stock": item.maxStock, "Current Stock": item.currentStock,
              "Unit Cost": item.unitCost, Status: stockStatus(toNum(item.currentStock), toNum(item.minStock)),
            })), "inventory.csv")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Item</Button>
          </div>
        }
      />

      <StatsGrid stats={stats} />

      {loading ? (
        <LoadingState message="Loading inventory..." />
      ) : items.length === 0 ? (
        <EmptyState message="No inventory items found." />
      ) : (
        <DataTable columns={columns} data={items} loading={loading} />
      )}

      <CRUDModal open={showModal} onClose={() => { setShowModal(false); setForm(emptyForm); setEditingId(null) }} onSave={handleSave} saving={saving} title={editingId ? "Edit Inventory Item" : "Add Inventory Item"} disabled={!form.name.trim()}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Item Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Portland Cement" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input type="text" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure</label>
              <select value={form.unitOfMeasure} onChange={e => setForm(p => ({ ...p, unitOfMeasure: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="pcs">Pieces</option>
                <option value="kg">Kilograms</option>
                <option value="m">Meters</option>
                <option value="sqm">Sq. Meters</option>
                <option value="liters">Liters</option>
                <option value="bags">Bags</option>
                <option value="rolls">Rolls</option>
                <option value="boxes">Boxes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Unit Cost ($)</label>
              <input type="number" step="0.01" value={form.unitCost} onChange={e => setForm(p => ({ ...p, unitCost: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Stock</label>
              <input type="number" value={form.minStock} onChange={e => setForm(p => ({ ...p, minStock: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Stock</label>
              <input type="number" value={form.maxStock} onChange={e => setForm(p => ({ ...p, maxStock: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Stock</label>
              <input type="number" value={form.currentStock} onChange={e => setForm(p => ({ ...p, currentStock: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
        </div>
      </CRUDModal>
      <ToastContainer />
    </div>
  )
}
