"use client"

import React, { useEffect, useState, useCallback } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useToast, ToastContainer } from "@/components/dashboard/toast"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Wrench, AlertTriangle, Clock, Pencil, Trash2, Fuel } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface Asset {
  id: string
  name: string
  assetCode: string
  category: string
  purchaseDate: string
  purchasePrice: string
  currentValue: string
  status: string
  location: string | null
  insuranceExpiry: string | null
  maintenanceCount: number
}

interface MaintenanceLog {
  id: string
  assetId: string
  assetName: string
  date: string
  type: string
  description: string
  cost: number
  technician: string
  nextDueDate: string
  status: string
}

interface FuelLog {
  id: string
  assetId: string
  assetName: string
  date: string
  liters: number
  cost: number
  odometerHours: number
}

const MAINTENANCE_KEY = "buildprop_maintenance_logs"
const FUEL_KEY = "buildprop_fuel_logs"

function loadLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveLocal<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

const emptyForm = {
  name: "",
  category: "equipment",
  purchaseDate: "",
  purchasePrice: "",
  currentValue: "",
  location: "",
  status: "active",
}

const emptyMaintenanceForm = {
  assetId: "",
  date: new Date().toISOString().split("T")[0],
  type: "scheduled",
  description: "",
  cost: "",
  technician: "",
  nextDueDate: "",
}

const emptyFuelForm = {
  assetId: "",
  date: new Date().toISOString().split("T")[0],
  liters: "",
  cost: "",
  odometerHours: "",
}

export default function EquipmentPage() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([])
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  const [showFuelModal, setShowFuelModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [maintenanceForm, setMaintenanceForm] = useState(emptyMaintenanceForm)
  const [fuelForm, setFuelForm] = useState(emptyFuelForm)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<"equipment" | "maintenance" | "fuel">("equipment")
  const [maintenanceFilter, setMaintenanceFilter] = useState("")
  const { toast } = useToast()

  const fetchAssets = useCallback(() => {
    setLoading(true)
    fetch("/api/assets").then(r => r.json()).then(d => { if (Array.isArray(d)) setAssets(d) }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const loadLocalData = useCallback(() => {
    setMaintenanceLogs(loadLocal<MaintenanceLog>(MAINTENANCE_KEY))
    setFuelLogs(loadLocal<FuelLog>(FUEL_KEY))
  }, [])

  useEffect(() => {
    fetchAssets()
    loadLocalData()
  }, [fetchAssets, loadLocalData])

  const equipment = assets.filter((a) => ["machinery", "equipment", "vehicle", "tools"].includes(a.category.toLowerCase()))
  const totalValue = equipment.reduce((sum, a) => sum + parseFloat(a.currentValue || "0"), 0)
  const activeEquipment = equipment.filter((a) => a.status === "active").length
  const maintenanceEquipment = equipment.filter((a) => a.status === "maintenance").length

  const now = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const thisMonthMaintenanceCost = maintenanceLogs
    .filter((l) => new Date(l.date) >= thisMonthStart)
    .reduce((sum, l) => sum + (l.cost || 0), 0)
  const thisMonthFuelCost = fuelLogs
    .filter((l) => new Date(l.date) >= thisMonthStart)
    .reduce((sum, l) => sum + (l.cost || 0), 0)
  const nextMaintenance = maintenanceLogs
    .filter((l) => l.nextDueDate && new Date(l.nextDueDate) > now)
    .sort((a, b) => new Date(a.nextDueDate).getTime() - new Date(b.nextDueDate).getTime())[0]

  function openAdd() { setEditingId(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(a: Asset) {
    setEditingId(a.id)
    setForm({
      name: a.name,
      category: a.category,
      purchaseDate: a.purchaseDate ? a.purchaseDate.split("T")[0] : "",
      purchasePrice: a.purchasePrice || "",
      currentValue: a.currentValue || "",
      location: a.location || "",
      status: a.status || "active",
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const url = editingId ? `/api/assets/${editingId}` : "/api/assets"
      const method = editingId ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        toast(editingId ? "Equipment updated." : "Equipment added.")
        setShowModal(false)
        setForm(emptyForm)
        setEditingId(null)
        fetchAssets()
      } else {
        toast({ title: "Failed to save equipment.", variant: "error" })
      }
    } catch {
      toast({ title: "Failed to save equipment.", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this equipment?")) return
    try {
      await fetch(`/api/assets/${id}`, { method: "DELETE" })
      toast({ title: "Equipment removed.", variant: "info" })
      fetchAssets()
    } catch {
      toast({ title: "Failed to delete equipment.", variant: "error" })
    }
  }

  function handleLogMaintenance() {
    if (!maintenanceForm.assetId || !maintenanceForm.date) return
    const asset = assets.find((a) => a.id === maintenanceForm.assetId)
    const log: MaintenanceLog = {
      id: crypto.randomUUID(),
      assetId: maintenanceForm.assetId,
      assetName: asset?.name || "Unknown",
      date: maintenanceForm.date,
      type: maintenanceForm.type,
      description: maintenanceForm.description,
      cost: maintenanceForm.cost ? Number(maintenanceForm.cost) : 0,
      technician: maintenanceForm.technician,
      nextDueDate: maintenanceForm.nextDueDate,
      status: "completed",
    }
    const updated = [log, ...maintenanceLogs]
    saveLocal(MAINTENANCE_KEY, updated)
    setMaintenanceLogs(updated)
    toast("Maintenance logged.")
    setShowMaintenanceModal(false)
    setMaintenanceForm(emptyMaintenanceForm)
  }

  function handleLogFuel() {
    if (!fuelForm.assetId || !fuelForm.date) return
    const asset = assets.find((a) => a.id === fuelForm.assetId)
    const log: FuelLog = {
      id: crypto.randomUUID(),
      assetId: fuelForm.assetId,
      assetName: asset?.name || "Unknown",
      date: fuelForm.date,
      liters: fuelForm.liters ? Number(fuelForm.liters) : 0,
      cost: fuelForm.cost ? Number(fuelForm.cost) : 0,
      odometerHours: fuelForm.odometerHours ? Number(fuelForm.odometerHours) : 0,
    }
    const updated = [log, ...fuelLogs]
    saveLocal(FUEL_KEY, updated)
    setFuelLogs(updated)
    toast("Fuel entry logged.")
    setShowFuelModal(false)
    setFuelForm(emptyFuelForm)
  }

  function handleDeleteMaintenance(id: string) {
    const updated = maintenanceLogs.filter((l) => l.id !== id)
    saveLocal(MAINTENANCE_KEY, updated)
    setMaintenanceLogs(updated)
    toast({ title: "Maintenance record removed.", variant: "info" })
  }

  function handleDeleteFuel(id: string) {
    const updated = fuelLogs.filter((l) => l.id !== id)
    saveLocal(FUEL_KEY, updated)
    setFuelLogs(updated)
    toast({ title: "Fuel entry removed.", variant: "info" })
  }

  const stats = [
    { label: "Total Equipment Value", value: formatCurrency(totalValue), icon: Wrench, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Equipment", value: activeEquipment, icon: Wrench, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "In Maintenance", value: maintenanceEquipment, icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Maintenance Cost (Month)", value: formatCurrency(thisMonthMaintenanceCost), icon: Clock, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Fuel Cost (Month)", value: formatCurrency(thisMonthFuelCost), icon: Fuel, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Next Maintenance", value: nextMaintenance ? formatDate(nextMaintenance.nextDueDate) : "None", icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  ]

  const equipmentColumns: Column<Asset>[] = [
    {
      key: "name", header: "Equipment",
      render: (e) => <span className="font-medium text-slate-900">{e.name}</span>,
    },
    { key: "assetCode", header: "Code", render: (e) => <span className="text-sm text-slate-500 font-mono">{e.assetCode}</span> },
    { key: "category", header: "Category", render: (e) => <span className="text-sm text-slate-500 capitalize">{e.category}</span> },
    { key: "location", header: "Location", render: (e) => <span className="text-sm text-slate-700">{e.location || "\u2014"}</span> },
    { key: "currentValue", header: "Value", render: (e) => <span className="font-bold text-slate-900">{formatCurrency(e.currentValue)}</span> },
    { key: "maintenanceCount", header: "Maintenance", render: (e) => <span className="text-sm text-slate-500">{e.maintenanceCount} records</span> },
    {
      key: "status", header: "Status",
      render: (e) => (
        <Badge variant={e.status === "active" ? "success" : e.status === "maintenance" ? "warning" : "secondary"}>
          {e.status}
        </Badge>
      ),
    },
    {
      key: "id", header: "Actions",
      render: (e) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(e)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => handleDelete(e.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" /></button>
        </div>
      ),
    },
  ]

  const filteredMaintenance = maintenanceFilter
    ? maintenanceLogs.filter((l) => l.assetId === maintenanceFilter)
    : maintenanceLogs

  const maintenanceColumns: Column<MaintenanceLog>[] = [
    { key: "date", header: "Date", render: (r) => <span className="text-sm text-slate-700">{formatDate(r.date)}</span> },
    { key: "assetName", header: "Equipment", render: (r) => <span className="text-sm font-medium text-slate-900">{r.assetName}</span> },
    { key: "type", header: "Type", render: (r) => <Badge variant={r.type === "emergency" ? "destructive" : r.type === "inspection" ? "secondary" : "success"}>{r.type}</Badge> },
    { key: "cost", header: "Cost", render: (r) => <span className="text-sm text-slate-700">{formatCurrency(r.cost)}</span> },
    { key: "technician", header: "Technician", render: (r) => <span className="text-sm text-slate-700">{r.technician || "\u2014"}</span> },
    { key: "status", header: "Status", render: (r) => <Badge variant="success">{r.status}</Badge> },
    {
      key: "id", header: "",
      render: (r) => (
        <button onClick={() => handleDeleteMaintenance(r.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
      ),
    },
  ]

  const fuelColumns: Column<FuelLog>[] = [
    { key: "date", header: "Date", render: (r) => <span className="text-sm text-slate-700">{formatDate(r.date)}</span> },
    { key: "assetName", header: "Vehicle/Equipment", render: (r) => <span className="text-sm font-medium text-slate-900">{r.assetName}</span> },
    { key: "liters", header: "Liters", render: (r) => <span className="text-sm text-slate-700">{r.liters}</span> },
    { key: "cost", header: "Cost", render: (r) => <span className="text-sm text-slate-700">{formatCurrency(r.cost)}</span> },
    { key: "odometerHours", header: "Odometer/Hours", render: (r) => <span className="text-sm text-slate-700">{r.odometerHours || "\u2014"}</span> },
    {
      key: "id", header: "",
      render: (r) => (
        <button onClick={() => handleDeleteFuel(r.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-slate-400 hover:text-red-500" /></button>
      ),
    },
  ]

  const totalLitersThisMonth = fuelLogs
    .filter((l) => new Date(l.date) >= thisMonthStart)
    .reduce((sum, l) => sum + l.liters, 0)
  const totalFuelCostThisMonth = thisMonthFuelCost
  const avgConsumption = totalLitersThisMonth > 0 && fuelLogs.filter((l) => new Date(l.date) >= thisMonthStart).length > 0
    ? (totalFuelCostThisMonth / totalLitersThisMonth).toFixed(2)
    : "0"

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment Management"
        description="Track equipment, maintenance, and fuel usage"
        action={{ label: "Add Equipment", icon: Plus, onClick: openAdd }}
        actions={[
          { label: "Log Maintenance", icon: Wrench, onClick: () => { setMaintenanceForm({ ...emptyMaintenanceForm, assetId: equipment[0]?.id || "" }); setShowMaintenanceModal(true) }, variant: "outline" },
          { label: "Log Fuel", icon: Fuel, onClick: () => { setFuelForm({ ...emptyFuelForm, assetId: equipment[0]?.id || "" }); setShowFuelModal(true) }, variant: "outline" },
        ]}
      />

      <StatsGrid stats={stats} />

      <div className="flex gap-1 border-b border-slate-200 mb-4">
        {(["equipment", "maintenance", "fuel"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t ? "bg-white text-slate-900 border border-b-0 border-slate-200" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "equipment" ? "Equipment" : t === "maintenance" ? "Maintenance Log" : "Fuel Log"}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingState message="Loading equipment..." />
      ) : (
        <>
          {tab === "equipment" && (
            equipment.length === 0 ? (
              <EmptyState message="No equipment found." />
            ) : (
              <DataTable columns={equipmentColumns} data={equipment} loading={loading} />
            )
          )}

          {tab === "maintenance" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <select
                  value={maintenanceFilter}
                  onChange={(e) => setMaintenanceFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                >
                  <option value="">All Equipment</option>
                  {equipment.map((e) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>
              <Card>
                <CardContent className="p-0">
                  <DataTable columns={maintenanceColumns} data={filteredMaintenance} loading={false} emptyMessage="No maintenance records found." />
                </CardContent>
              </Card>
            </div>
          )}

          {tab === "fuel" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Total Fuel Cost (Month)</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(totalFuelCostThisMonth)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Total Liters (Month)</p>
                    <p className="text-lg font-bold text-slate-900">{totalLitersThisMonth.toFixed(1)} L</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <p className="text-xs text-slate-500 mb-1">Avg Cost per Liter</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(avgConsumption)}</p>
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardContent className="p-0">
                  <DataTable columns={fuelColumns} data={fuelLogs} loading={false} emptyMessage="No fuel entries found." />
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      <CRUDModal open={showModal} onClose={() => { setShowModal(false); setForm(emptyForm); setEditingId(null) }} onSave={handleSave} saving={saving} title={editingId ? "Edit Equipment" : "Add Equipment"} disabled={!form.name.trim()}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Equipment Name *</label>
            <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Excavator CAT 320" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="equipment">Equipment</option>
                <option value="machinery">Machinery</option>
                <option value="tools">Tools</option>
                <option value="vehicle">Vehicle</option>
                <option value="general">General</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price</label>
              <input type="number" value={form.purchasePrice} onChange={e => setForm(p => ({ ...p, purchasePrice: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Current Value</label>
              <input type="number" value={form.currentValue} onChange={e => setForm(p => ({ ...p, currentValue: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="0.00" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Project Site A" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
            <input type="date" value={form.purchaseDate} onChange={e => setForm(p => ({ ...p, purchaseDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      </CRUDModal>

      <CRUDModal open={showMaintenanceModal} onClose={() => { setShowMaintenanceModal(false); setMaintenanceForm(emptyMaintenanceForm) }} onSave={handleLogMaintenance} saving={false} title="Log Maintenance" disabled={!maintenanceForm.assetId || !maintenanceForm.date}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Equipment *</label>
            <select value={maintenanceForm.assetId} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, assetId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select equipment</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
              <input type="date" value={maintenanceForm.date} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, date: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={maintenanceForm.type} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="scheduled">Scheduled</option>
                <option value="emergency">Emergency</option>
                <option value="inspection">Inspection</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={maintenanceForm.description} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="What was done..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost</label>
              <input type="number" value={maintenanceForm.cost} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Technician</label>
              <input type="text" value={maintenanceForm.technician} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, technician: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Name" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Next Due Date</label>
            <input type="date" value={maintenanceForm.nextDueDate} onChange={(e) => setMaintenanceForm({ ...maintenanceForm, nextDueDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      </CRUDModal>

      <CRUDModal open={showFuelModal} onClose={() => { setShowFuelModal(false); setFuelForm(emptyFuelForm) }} onSave={handleLogFuel} saving={false} title="Log Fuel Entry" disabled={!fuelForm.assetId || !fuelForm.date}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle/Equipment *</label>
            <select value={fuelForm.assetId} onChange={(e) => setFuelForm({ ...fuelForm, assetId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select vehicle/equipment</option>
              {equipment.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
            <input type="date" value={fuelForm.date} onChange={(e) => setFuelForm({ ...fuelForm, date: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Liters</label>
              <input type="number" value={fuelForm.liters} onChange={(e) => setFuelForm({ ...fuelForm, liters: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="0" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cost</label>
              <input type="number" value={fuelForm.cost} onChange={(e) => setFuelForm({ ...fuelForm, cost: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Odometer/Hours</label>
              <input type="number" value={fuelForm.odometerHours} onChange={(e) => setFuelForm({ ...fuelForm, odometerHours: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="0" />
            </div>
          </div>
        </div>
      </CRUDModal>
      <ToastContainer />
    </div>
  )
}
