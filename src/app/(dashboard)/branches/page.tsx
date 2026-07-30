"use client"

import React, { useState, useEffect, useCallback } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useToast, ToastContainer } from "@/components/dashboard/toast"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Building, Users, FileText, MapPin, Trash2, Pencil, Car } from "lucide-react"

interface Branch {
  id: string
  name: string
  code: string
  address: string
  city: string
  phone: string | null
  email: string | null
  manager: string | null
  status: string
  vehicleCount: number
  contractCount: number
  createdAt: string
}

const emptyForm = { name: "", code: "", address: "", city: "", phone: "", email: "", manager: "" }

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<Branch | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/branches")
      const json = await res.json()
      if (Array.isArray(json)) setBranches(json)
    } catch {
      toast({ title: "Failed to load branches", variant: "error" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const totalVehicles = branches.reduce((s, b) => s + b.vehicleCount, 0)
  const totalContracts = branches.reduce((s, b) => s + b.contractCount, 0)
  const activeBranches = branches.filter(b => b.status === "active").length

  function openAdd() { setEditingItem(null); setForm(emptyForm); setShowModal(true) }
  function openEdit(b: Branch) {
    setEditingItem(b)
    setForm({ name: b.name, code: b.code, address: b.address, city: b.city, phone: b.phone || "", email: b.email || "", manager: b.manager || "" })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim() || !form.code.trim() || !form.address.trim() || !form.city.trim()) return
    setSaving(true)
    try {
      const url = editingItem ? `/api/branches/${editingItem.id}` : "/api/branches"
      const method = editingItem ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone || null,
          email: form.email || null,
          manager: form.manager || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }))
        throw new Error(err.error || "Failed")
      }
      toast(editingItem ? "Branch updated." : "Branch added.")
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
    if (!confirm("Are you sure you want to delete this branch?")) return
    try {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed" }))
        toast({ title: err.error || "Failed to delete", variant: "error" })
        return
      }
      toast({ title: "Branch removed.", variant: "info" })
      fetchData()
    } catch {
      toast({ title: "Failed to delete", variant: "error" })
    }
  }

  const stats = [
    { label: "Total Branches", value: String(branches.length), icon: Building, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active", value: String(activeBranches), icon: Building, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Fleet Vehicles", value: String(totalVehicles), icon: Car, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Contracts", value: String(totalContracts), icon: FileText, color: "text-purple-500", bg: "bg-purple-50" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Multi-Branch Management"
        description="Manage and monitor all branch operations"
        action={{ label: "Add Branch", icon: Building, onClick: openAdd }}
      />

      <StatsGrid stats={stats} />

      {loading ? (
        <LoadingState message="Loading branches..." />
      ) : branches.length === 0 ? (
        <EmptyState message="No branches yet." icon={Building} action={{ label: "Add Branch", onClick: openAdd }} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {branches.map((branch) => (
            <Card key={branch.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-900">{branch.name}</h3>
                      <Badge variant="secondary" className="text-xs">{branch.code}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {branch.address}, {branch.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={branch.status === "active" ? "success" : "secondary"}>{branch.status}</Badge>
                    <button onClick={() => openEdit(branch)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(branch.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center p-3 rounded-lg bg-slate-50">
                    <p className="text-xl font-bold text-slate-900">{branch.vehicleCount}</p>
                    <p className="text-xs text-slate-500">Vehicles</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-slate-50">
                    <p className="text-xl font-bold text-slate-900">{branch.contractCount}</p>
                    <p className="text-xs text-slate-500">Contracts</p>
                  </div>
                </div>

                {branch.manager && (
                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
                    <div className="h-8 w-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-600">
                      {branch.manager.split(" ").map(n => n[0]).join("")}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{branch.manager}</p>
                      <p className="text-xs text-slate-500">Branch Manager</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CRUDModal open={showModal} onClose={() => { setShowModal(false); setForm(emptyForm); setEditingItem(null) }} onSave={handleSave} saving={saving} title={editingItem ? "Edit Branch" : "Add New Branch"} disabled={!form.name.trim() || !form.code.trim() || !form.address.trim() || !form.city.trim()}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name *</label>
              <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Accra East Branch" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
              <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. ACC-001" disabled={!!editingItem} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address *</label>
            <input type="text" value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Full address" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">City *</label>
              <input type="text" value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Accra" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Branch Manager</label>
              <input type="text" value={form.manager} onChange={e => setForm(p => ({ ...p, manager: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Manager name" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input type="text" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="+233..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="branch@company.com" />
            </div>
          </div>
        </div>
      </CRUDModal>
      <ToastContainer />
    </div>
  )
}
