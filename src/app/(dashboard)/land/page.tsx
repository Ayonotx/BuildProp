"use client"

import React from "react"
import { useCrud } from "@/hooks/use-crud"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, MapPin, Search, Pencil, Trash2 } from "lucide-react"
import { formatCurrency, statusVariant } from "@/lib/utils"

interface LandRecord {
  id: string
  title: string
  surveyNumber: string | null
  areaAcres: string | null
  areaSqft: string | null
  landType: string
  marketValue: string
  address: string | null
  city: string | null
  ownerName: string | null
  ownershipType: string | null
  encumbranceStatus: string
  status: string
  transactionCount: number
}

const defaultForm = {
  title: "",
  surveyNumber: "",
  areaAcres: "",
  landType: "residential",
  marketValue: "",
  address: "",
  city: "",
  ownerName: "",
  ownershipType: "",
}

export default function LandPage() {
  const {
    data: lands, loading, showModal, setShowModal,
    formData, setFormData, saving,
    editingItem, setEditingItem,
    handleSave, handleDelete,
  } = useCrud<LandRecord>({
    apiPath: "/api/land",
    defaultForm,
    transformBody: (data) => ({
      ...data,
      areaAcres: data.areaAcres ? Number(data.areaAcres) : undefined,
      marketValue: data.marketValue ? Number(data.marketValue) : 0,
    }),
  })

  const totalValue = lands.reduce((sum: number, l: LandRecord) => sum + parseFloat(l.marketValue || "0"), 0)
  const available = lands.filter((l: LandRecord) => l.status === "available").length
  const underDispute = lands.filter((l: LandRecord) => l.encumbranceStatus === "encumbered").length

  const stats = [
    { label: "Total Plots", value: lands.length, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Value", value: formatCurrency(totalValue), color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Available", value: available, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Under Dispute", value: underDispute, color: "text-red-500", bg: "bg-red-50" },
  ]

  const columns: Column<LandRecord>[] = [
    {
      key: "title",
      header: "Property",
      render: (land) => (
        <div className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-orange-400" />
          <div>
            <p className="font-medium text-slate-900">{land.title}</p>
            <p className="text-xs text-slate-500">{land.city || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "surveyNumber", header: "Survey No", render: (land) => <span className="text-sm text-slate-500 font-mono">{land.surveyNumber || "—"}</span> },
    { key: "areaAcres", header: "Area", render: (land) => <span className="text-sm text-slate-700">{land.areaAcres ? `${land.areaAcres} acres` : "—"}</span> },
    { key: "landType", header: "Type", render: (land) => <span className="text-sm text-slate-700 capitalize">{land.landType}</span> },
    { key: "marketValue", header: "Value", render: (land) => <span className="font-bold text-slate-900">{formatCurrency(parseFloat(land.marketValue || "0"))}</span> },
    { key: "status", header: "Status", render: (land) => <Badge variant={statusVariant(land.status)}>{land.status}</Badge> },
    { key: "ownerName", header: "Owner", render: (land) => <span className="text-sm text-slate-500">{land.ownerName || "—"}</span> },
    {
      key: "id", header: "Actions",
      render: (land) => (
        <div className="flex items-center gap-1">
          <button onClick={() => {
            setEditingItem(land)
            setFormData({
              title: land.title,
              surveyNumber: land.surveyNumber || "",
              areaAcres: land.areaAcres || "",
              landType: land.landType,
              marketValue: land.marketValue || "",
              address: land.address || "",
              city: land.city || "",
              ownerName: land.ownerName || "",
              ownershipType: land.ownershipType || "",
            })
            setShowModal(true)
          }} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="h-4 w-4 text-slate-500" /></button>
          <button onClick={() => handleDelete(land.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" /></button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Land Records"
        description="Manage land documentation and ownership"
        action={{ label: "Add Land Record", icon: Plus, onClick: () => { setEditingItem(null); setFormData(defaultForm); setShowModal(true) } }}
      />

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Land Inventory</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search land records..." className="rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400" />
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={lands} loading={loading} emptyMessage="No land records yet." loadingMessage="Loading land records..." />
        </CardContent>
      </Card>

      <CRUDModal open={showModal} onClose={() => { setShowModal(false); setEditingItem(null) }} onSave={handleSave} saving={saving} title={editingItem ? "Edit Land Record" : "Add Land Record"} disabled={!formData.title || !formData.marketValue}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Survey Number</label>
            <input type="text" value={formData.surveyNumber} onChange={(e) => setFormData({ ...formData, surveyNumber: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Area (Acres)</label>
            <input type="number" value={formData.areaAcres} onChange={(e) => setFormData({ ...formData, areaAcres: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Land Type</label>
            <select value={formData.landType} onChange={(e) => setFormData({ ...formData, landType: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="agricultural">Agricultural</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Market Value *</label>
            <input type="number" value={formData.marketValue} onChange={(e) => setFormData({ ...formData, marketValue: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
            <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Owner Name</label>
            <input type="text" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ownership Type</label>
            <select value={formData.ownershipType} onChange={(e) => setFormData({ ...formData, ownershipType: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="">Select</option>
              <option value="freehold">Freehold</option>
              <option value="leasehold">Leasehold</option>
              <option value="common">Common</option>
            </select>
          </div>
        </div>
      </CRUDModal>
    </div>
  )
}
