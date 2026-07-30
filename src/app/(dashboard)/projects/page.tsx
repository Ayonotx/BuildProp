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
import { Plus, FolderKanban, Clock, CheckCircle2, AlertTriangle, Pencil, Trash2, Download } from "lucide-react"
import { useToast } from "@/components/dashboard/toast"
import { exportToPdf } from "@/lib/pdf-export"
import { formatCurrency, formatDate, statusVariant, statusLabel } from "@/lib/utils"

interface Project {
  id: string
  name: string
  code: string
  description: string | null
  projectType: string
  status: string
  priority: string
  startDate: string | null
  endDate: string | null
  estimatedBudget: string
  actualCost: string
  completionPercentage: string
  location: string | null
  projectManagerId: string | null
}

const defaultForm = {
  name: "",
  code: "",
  description: "",
  projectType: "residential",
  status: "planning",
  priority: "medium",
  startDate: "",
  endDate: "",
  estimatedBudget: "",
  location: "",
}

export default function ProjectsPage() {
  const { toast } = useToast()
  const {
    data: projects, loading, showModal, setShowModal,
    editingItem, setEditingItem, formData, setFormData,
    saving, fetchData, handleSave, handleDelete,
  } = useCrud<Project>({
    apiPath: "/api/projects",
    defaultForm,
    transformBody: (form) => ({
      ...form,
      estimatedBudget: form.estimatedBudget ? Number(form.estimatedBudget) : undefined,
    }),
    onSuccess: (action) => {
      if (action === "save") {
        toast({ title: "Success", description: editingItem ? "Project updated successfully" : "Project created successfully", variant: "success" })
      } else {
        toast({ title: "Success", description: "Project deleted successfully", variant: "success" })
      }
    },
  })

  function openCreate() {
    setEditingItem(null)
    setFormData(defaultForm)
    setShowModal(true)
  }

  function openEdit(item: Project) {
    setEditingItem(item)
    setFormData({
      name: item.name,
      code: item.code,
      description: item.description || "",
      projectType: item.projectType,
      status: item.status,
      priority: item.priority,
      startDate: item.startDate ? item.startDate.split("T")[0] : "",
      endDate: item.endDate ? item.endDate.split("T")[0] : "",
      estimatedBudget: item.estimatedBudget || "",
      location: item.location || "",
    })
    setShowModal(true)
  }

  const totalProjects = projects.length
  const inProgress = projects.filter((p: Project) => p.status === "in_progress").length
  const completed = projects.filter((p: Project) => p.status === "completed").length
  const onHold = projects.filter((p: Project) => p.status === "on_hold").length

  const stats = [
    { label: "Total Projects", value: totalProjects, icon: FolderKanban, color: "text-blue-500" },
    { label: "In Progress", value: inProgress, icon: Clock, color: "text-orange-500" },
    { label: "Completed", value: completed, icon: CheckCircle2, color: "text-emerald-500" },
    { label: "On Hold", value: onHold, icon: AlertTriangle, color: "text-amber-500" },
  ]

  const columns: Column<Project>[] = [
    {
      key: "name", header: "Project",
      render: (p) => (
        <div>
          <p className="font-medium text-slate-900">{p.name}</p>
          <p className="text-xs text-slate-500">{p.code}</p>
        </div>
      ),
    },
    {
      key: "status", header: "Status",
      render: (p) => <Badge variant={statusVariant(p.status) as any}>{statusLabel(p.status)}</Badge>,
    },
    {
      key: "completionPercentage", header: "Progress",
      render: (p) => (
        <div className="flex items-center gap-2">
          <div className="w-24 bg-slate-100 rounded-full h-2">
            <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${p.completionPercentage || 0}%` }} />
          </div>
          <span className="text-xs text-slate-500">{p.completionPercentage || 0}%</span>
        </div>
      ),
    },
    {
      key: "estimatedBudget", header: "Budget",
      render: (p) => <span className="text-sm text-slate-700">{formatCurrency(p.estimatedBudget)}</span>,
    },
    {
      key: "endDate", header: "Deadline",
      render: (p) => <span className="text-sm text-slate-700">{formatDate(p.endDate)}</span>,
    },
    {
      key: "actions", header: "Actions", className: "text-right",
      render: (p) => (
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
        </div>
      ),
    },
  ]

  function handleExportPdf() {
    exportToPdf({
      title: "Projects",
      subtitle: `${projects.length} project${projects.length !== 1 ? "s" : ""}`,
      headers: ["Project", "Code", "Status", "Progress", "Budget", "Deadline"],
      rows: projects.map((p: Project) => [
        p.name, p.code, statusLabel(p.status), `${p.completionPercentage || 0}%`,
        formatCurrency(p.estimatedBudget), formatDate(p.endDate),
      ]),
      filename: "projects.pdf",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description="Manage your construction projects"
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportPdf}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Project</Button>
          </div>
        }
      />

      <StatsGrid stats={stats} />

      {loading ? (
        <LoadingState message="Loading projects..." />
      ) : projects.length === 0 ? (
        <EmptyState message="No projects yet. Create your first project!" />
      ) : (
        <DataTable columns={columns} data={projects} loading={loading} />
      )}

      <CRUDModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? "Edit Project" : "New Project"}
        onSave={handleSave}
        saving={saving}
        disabled={!formData.name || !formData.code}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Code *</label>
            <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="PRJ-001" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project Type</label>
            <select value={formData.projectType} onChange={e => setFormData({...formData, projectType: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="residential">Residential</option>
              <option value="commercial">Commercial</option>
              <option value="industrial">Industrial</option>
              <option value="infrastructure">Infrastructure</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="planning">Planning</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
            <select value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Budget</label>
            <input type="number" value={formData.estimatedBudget} onChange={e => setFormData({...formData, estimatedBudget: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input type="date" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input type="date" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
            <input type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      </CRUDModal>
    </div>
  )
}
