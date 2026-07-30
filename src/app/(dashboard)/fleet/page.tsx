"use client"

import React, { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useToast, ToastContainer } from "@/components/dashboard/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Car, Wrench, Shield, Activity, Clock, Trash2, Pencil, Search } from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Vehicle {
  id: string
  name: string
  make: string
  model: string
  year: number
  licensePlate: string
  status: string
  fuelType: string
  mileage: number
  assignedTo: string | null
  branchId: string | null
  branch: { id: string; name: string; code: string } | null
  createdAt: string
}

const emptyForm = { name: "", make: "", model: "", year: String(new Date().getFullYear()), licensePlate: "", status: "active", fuelType: "diesel", mileage: "0", assignedTo: "", branchId: "" }

export default function FleetPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Vehicle | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/fleet")
      const json = await res.json()
      if (Array.isArray(json)) setVehicles(json)
    } catch {
      toast({ title: "Failed to load vehicles", variant: "error" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const filtered = vehicles.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.licensePlate.toLowerCase().includes(search.toLowerCase()) ||
    v.make.toLowerCase().includes(search.toLowerCase()) ||
    v.model.toLowerCase().includes(search.toLowerCase())
  )

  const totalActive = vehicles.filter(v => v.status === "active").length
  const totalMaintenance = vehicles.filter(v => v.status === "maintenance").length
  const totalRetired = vehicles.filter(v => v.status === "retired").length

  function openAdd() { setEditingItem(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(v: Vehicle) {
    setEditingItem(v)
    setForm({ name: v.name, make: v.make, model: v.model, year: String(v.year), licensePlate: v.licensePlate, status: v.status, fuelType: v.fuelType, mileage: String(v.mileage), assignedTo: v.assignedTo || "", branchId: v.branchId || "" })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.licensePlate.trim()) return
    setSaving(true)
    try {
      const url = editingItem ? `/api/fleet/${editingItem.id}` : "/api/fleet"
      const method = editingItem ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          year: Number(form.year) || new Date().getFullYear(),
          mileage: Number(form.mileage) || 0,
          branchId: form.branchId || null,
          assignedTo: form.assignedTo || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }))
        throw new Error(err.error || "Failed")
      }
      toast(editingItem ? "Vehicle updated." : "Vehicle added.")
      setShowModal(false)
      setForm(emptyForm)
      setEditingItem(null)
      fetchData()
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Failed to save", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this vehicle?")) return
    try {
      await fetch(`/api/fleet/${id}`, { method: "DELETE" })
      toast({ title: "Vehicle removed.", variant: "info" })
      fetchData()
    } catch {
      toast({ title: "Failed to delete", variant: "error" })
    }
  }

  const stats = [
    { label: "Total Vehicles", value: String(vehicles.length), icon: Car, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active", value: String(totalActive), icon: Activity, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "In Maintenance", value: String(totalMaintenance), icon: Wrench, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Retired", value: String(totalRetired), icon: Shield, color: "text-red-500", bg: "bg-red-50" },
  ]

  const columns: Column<Vehicle>[] = [
    {
      key: "name", header: "Vehicle",
      render: (v) => (
        <div className="flex items-center gap-3">
          <Car className="h-5 w-5 text-slate-400" />
          <div>
            <p className="font-medium text-slate-900">{v.name}</p>
            <p className="text-xs text-slate-500">{v.year} {v.make} {v.model}</p>
          </div>
        </div>
      ),
    },
    { key: "licensePlate", header: "Plate", render: (v) => <span className="text-sm font-mono text-slate-700">{v.licensePlate}</span> },
    { key: "fuelType", header: "Fuel", render: (v) => <span className="text-sm text-slate-500 capitalize">{v.fuelType}</span> },
    {
      key: "status", header: "Status",
      render: (v) => <Badge variant={v.status === "active" ? "success" : v.status === "maintenance" ? "warning" : "secondary"}>{v.status}</Badge>,
    },
    { key: "mileage", header: "Mileage", render: (v) => <span className="text-sm text-slate-700">{v.mileage.toLocaleString()} km</span> },
    { key: "branch", header: "Branch", render: (v) => <span className="text-sm text-slate-500">{v.branch?.name || "—"}</span> },
    {
      key: "actions", header: "Actions",
      render: (v) => (
        <div className="flex items-center gap-1">
          <button onClick={() => openEdit(v)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => handleDelete(v.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fleet Management"
        description="Manage vehicles, maintenance schedules, and service tracking"
        action={<Button onClick={openAdd}><Plus className="h-4 w-4 mr-2" />Add Vehicle</Button>}
      />

      <StatsGrid stats={stats} />

      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-10 pr-3 py-2 text-sm outline-none focus:border-orange-400"
          />
        </div>
      </div>

      {loading ? (
        <LoadingState message="Loading vehicles..." />
      ) : filtered.length === 0 ? (
        <EmptyState message="No vehicles found." icon={Car} action={{ label: "Add Vehicle", onClick: openAdd }} />
      ) : (
        <DataTable columns={columns} data={filtered} loading={loading} />
      )}

      <Card>
        <CardHeader><CardTitle>Upcoming Maintenance</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {vehicles.filter(v => v.status === "maintenance").slice(0, 4).map((v) => (
              <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Wrench className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium text-slate-900">{v.name}</p>
                    <p className="text-sm text-slate-500">{v.licensePlate}</p>
                  </div>
                </div>
                <Badge variant="warning">In Shop</Badge>
              </div>
            ))}
            {vehicles.filter(v => v.status === "maintenance").length === 0 && (
              <p className="text-sm text-slate-400 text-center py-4">No vehicles in maintenance.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <CRUDModal
        open={showModal}
        onClose={() => { setShowModal(false); setForm(emptyForm); setEditingItem(null) }}
        title={editingItem ? "Edit Vehicle" : "Add New Vehicle"}
        onSave={handleSave}
        saving={saving}
        disabled={!form.name.trim() || !form.licensePlate.trim()}
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Toyota Hilux" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">License Plate *</label>
              <input type="text" value={form.licensePlate} onChange={e => setForm(p => ({ ...p, licensePlate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="GR-0000" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Make</label>
              <input type="text" value={form.make} onChange={e => setForm(p => ({ ...p, make: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Toyota" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
              <input type="text" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Hilux" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
              <input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="active">Active</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Fuel Type</label>
              <select value={form.fuelType} onChange={e => setForm(p => ({ ...p, fuelType: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="diesel">Diesel</option><option value="petrol">Petrol</option><option value="electric">Electric</option><option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mileage (km)</label>
            <input type="number" value={form.mileage} onChange={e => setForm(p => ({ ...p, mileage: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
            <input type="text" value={form.assignedTo} onChange={e => setForm(p => ({ ...p, assignedTo: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Person name (optional)" />
          </div>
        </div>
      </CRUDModal>
      <ToastContainer />
    </div>
  )
}
