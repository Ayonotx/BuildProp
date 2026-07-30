"use client"

import React, { useState } from "react"
import { useCrud } from "@/hooks/use-crud"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, CheckSquare, Clock, AlertCircle, Trash2 } from "lucide-react"
import { useToast } from "@/components/dashboard/toast"
import { formatDate, statusVariant, priorityVariant } from "@/lib/utils"

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  projectName: string
  projectId: string
  assignedTo: string | null
  dueDate: string | null
  estimatedHours: number | null
  actualHours: number | null
}

const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

const nextStatus: Record<string, string> = {
  todo: "in_progress",
  in_progress: "completed",
  completed: "todo",
}

const defaultForm = { projectId: "", title: "", description: "", priority: "medium", dueDate: "", estimatedHours: "" }

export default function TasksPage() {
  const [filter, setFilter] = useState("all")
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const { toast } = useToast()
  const {
    data: tasks, loading, showModal, setShowModal,
    formData, setFormData, saving, fetchData, handleSave, handleDelete,
  } = useCrud<Task>({
    apiPath: "/api/tasks",
    defaultForm,
    transformBody: (form) => ({
      ...form,
      estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
    }),
    onSuccess: (action) => {
      if (action === "save") {
        toast({ title: "Success", description: "Task saved successfully", variant: "success" })
      } else {
        toast({ title: "Success", description: "Task deleted successfully", variant: "success" })
      }
    },
  })

  async function handleToggleStatus(task: Task) {
    const newStatus = nextStatus[task.status] || "todo"
    try {
      await fetch(`/api/tasks/${task.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })
      fetchData()
    } catch {
      alert("Error updating task")
    }
  }

  const currentUser = typeof window !== 'undefined' ? localStorage.getItem('buildprop_current_user') : null
  const myTasks = myTasksOnly && currentUser ? tasks.filter((t: Task) => t.assignedTo === currentUser) : tasks
  const filtered = filter === "all" ? myTasks : myTasks.filter((t: Task) => t.status === filter)
  const totalTasks = myTasks.length
  const todoCount = myTasks.filter((t: Task) => t.status === "todo").length
  const inProgressCount = myTasks.filter((t: Task) => t.status === "in_progress").length
  const completedCount = myTasks.filter((t: Task) => t.status === "completed").length

  const stats = [
    { label: "Total Tasks", value: totalTasks, icon: CheckSquare, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "To Do", value: todoCount, icon: AlertCircle, color: "text-slate-500", bg: "bg-slate-50" },
    { label: "In Progress", value: inProgressCount, icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Completed", value: completedCount, icon: CheckSquare, color: "text-emerald-500", bg: "bg-emerald-50" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Task Management"
        description="Assign and track work tasks across projects"
        action={<Button onClick={() => setShowModal(true)}><Plus className="h-4 w-4 mr-2" />New Task</Button>}
      />

      <StatsGrid stats={stats} />

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 border-b border-slate-200">
          {["all", "todo", "in_progress", "completed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                filter === f ? "bg-white text-slate-900 border border-b-0 border-slate-200" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label(f)}
            </button>
          ))}
        </div>
        <button
          onClick={() => setMyTasksOnly(!myTasksOnly)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
            myTasksOnly
              ? "bg-orange-500 text-white border-orange-500"
              : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
          }`}
        >
          {myTasksOnly ? "My Tasks" : "All Tasks"}
        </button>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <LoadingState message="Loading tasks..." />
          ) : filtered.length === 0 ? (
            <EmptyState message="No tasks found." />
          ) : (
            <div className="space-y-0">
              {filtered.map((task: Task) => (
                <div key={task.id} className="flex items-center gap-4 p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <button
                    onClick={() => handleToggleStatus(task)}
                    className={`h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                      task.status === "completed" ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 hover:border-orange-400"
                    }`}
                  >
                    {task.status === "completed" && <span className="text-xs">✓</span>}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${task.status === "completed" ? "text-slate-400 line-through" : "text-slate-900"}`}>{task.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-500">
                      <span>{task.projectName}</span>
                      {task.assignedTo && (<><span>•</span><span>{task.assignedTo}</span></>)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={priorityVariant(task.priority) as any}>{label(task.priority)}</Badge>
                    <Badge variant={statusVariant(task.status) as any}>{label(task.status)}</Badge>
                    <span className="text-sm text-slate-500">{formatDate(task.dueDate)}</span>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(task.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
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
        title="New Task"
        onSave={handleSave}
        saving={saving}
        disabled={!formData.projectId || !formData.title}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Project ID *</label>
            <input type="text" value={formData.projectId} onChange={(e) => setFormData({ ...formData, projectId: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Project UUID" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
              <select value={formData.priority} onChange={(e) => setFormData({ ...formData, priority: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input type="date" value={formData.dueDate} onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Estimated Hours</label>
            <input type="number" value={formData.estimatedHours} onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" min={0} />
          </div>
        </div>
      </CRUDModal>
    </div>
  )
}
