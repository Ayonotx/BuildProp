"use client"

import React from "react"
import { useCrud } from "@/hooks/use-crud"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { DataTable, type Column } from "@/components/dashboard/data-table"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Briefcase, Wrench, DollarSign } from "lucide-react"
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
  createdAt: string
}

const defaultForm = {
  name: "",
  category: "general",
  purchaseDate: "",
  purchasePrice: "",
  currentValue: "",
  location: "",
}

export default function AssetsPage() {
  const {
    data: assets, loading, showModal, setShowModal,
    formData, setFormData, saving, fetchData, handleSave,
  } = useCrud<Asset>({
    apiPath: "/api/assets",
    defaultForm,
    transformBody: (form) => ({
      ...form,
      purchasePrice: form.purchasePrice ? Number(form.purchasePrice) : 0,
      currentValue: form.currentValue ? Number(form.currentValue) : 0,
    }),
  })

  const totalValue = assets.reduce((sum: number, a: Asset) => sum + parseFloat(a.currentValue || "0"), 0)
  const activeAssets = assets.filter((a: Asset) => a.status === "active").length
  const maintenanceAssets = assets.filter((a: Asset) => a.status === "maintenance").length

  const stats = [
    { label: "Total Assets", value: assets.length, icon: Briefcase, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Total Value", value: formatCurrency(totalValue), icon: DollarSign, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Active", value: activeAssets, icon: Briefcase, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Under Maintenance", value: maintenanceAssets, icon: Wrench, color: "text-amber-500", bg: "bg-amber-50" },
  ]

  const columns: Column<Asset>[] = [
    {
      key: "name", header: "Asset",
      render: (a) => (
        <div>
          <p className="font-medium text-slate-900">{a.name}</p>
          <p className="text-xs text-slate-500">{formatDate(a.purchaseDate)}</p>
        </div>
      ),
    },
    { key: "assetCode", header: "Code", render: (a) => <span className="text-sm text-slate-500 font-mono">{a.assetCode}</span> },
    { key: "category", header: "Category", render: (a) => <span className="text-sm text-slate-700 capitalize">{a.category}</span> },
    { key: "purchasePrice", header: "Purchase Cost", render: (a) => <span className="text-sm text-slate-700">{formatCurrency(a.purchasePrice)}</span> },
    { key: "currentValue", header: "Current Value", render: (a) => <span className="font-bold text-slate-900">{formatCurrency(a.currentValue)}</span> },
    { key: "location", header: "Location", render: (a) => <span className="text-sm text-slate-500">{a.location || "—"}</span> },
    {
      key: "status", header: "Status",
      render: (a) => (
        <Badge variant={a.status === "active" ? "success" : a.status === "maintenance" ? "warning" : "secondary"}>
          {a.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Asset Management"
        description="Track company assets and equipment"
        action={<Button onClick={() => { setFormData(defaultForm); setShowModal(true) }}><Plus className="h-4 w-4 mr-2" />Add Asset</Button>}
      />

      <StatsGrid stats={stats} />

      {loading ? (
        <LoadingState message="Loading assets..." />
      ) : assets.length === 0 ? (
        <EmptyState message="No assets yet." />
      ) : (
        <DataTable columns={columns} data={assets} loading={loading} />
      )}

      <CRUDModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Asset"
        onSave={handleSave}
        saving={saving}
        disabled={!formData.name}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
            <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="general">General</option>
              <option value="machinery">Machinery</option>
              <option value="equipment">Equipment</option>
              <option value="office">Office</option>
              <option value="vehicle">Vehicle</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Date</label>
            <input type="date" value={formData.purchaseDate} onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Purchase Price</label>
            <input type="number" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Current Value</label>
            <input type="number" value={formData.currentValue} onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      </CRUDModal>
    </div>
  )
}
