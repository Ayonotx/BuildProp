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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, Clock, AlertTriangle, CheckCircle2, Shield, Plus, Trash2, Pencil } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/utils"

interface Contract {
  id: string
  title: string
  type: string
  partyName: string
  value: number
  status: string
  startDate: string
  endDate: string
  branchId: string | null
  branch: { id: string; name: string; code: string } | null
  notes: string | null
  createdAt: string
}

interface ComplianceItem {
  id: string
  title: string
  description: string | null
  category: string
  status: string
  dueDate: string | null
  completedDate: string | null
  assignedTo: string | null
  createdAt: string
}

const emptyContractForm = { title: "", type: "service", partyName: "", value: "", startDate: "", endDate: "", branchId: "", notes: "" }
const emptyComplianceForm = { title: "", description: "", category: "regulatory", dueDate: "", assignedTo: "" }

export default function LegalPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [compliance, setCompliance] = useState<ComplianceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showContractModal, setShowContractModal] = useState(false)
  const [showComplianceModal, setShowComplianceModal] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [editingCompliance, setEditingCompliance] = useState<ComplianceItem | null>(null)
  const [contractForm, setContractForm] = useState(emptyContractForm)
  const [complianceForm, setComplianceForm] = useState(emptyComplianceForm)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/legal")
      const json = await res.json()
      if (json.contracts) setContracts(json.contracts)
      if (json.compliance) setCompliance(json.compliance)
    } catch {
      toast({ title: "Failed to load legal data", variant: "error" })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const activeContracts = contracts.filter(c => c.status === "active").length
  const pendingContracts = contracts.filter(c => c.status === "pending").length
  const expiredContracts = contracts.filter(c => c.status === "expired" || c.status === "terminated").length
  const complianceCompliant = compliance.filter(c => c.status === "compliant").length
  const compliancePending = compliance.filter(c => c.status === "pending").length
  const complianceOverdue = compliance.filter(c => c.status === "overdue").length

  function openAddContract() { setEditingContract(null); setContractForm(emptyContractForm); setShowContractModal(true) }
  function openEditContract(c: Contract) {
    setEditingContract(c)
    setContractForm({ title: c.title, type: c.type, partyName: c.partyName, value: String(c.value), startDate: c.startDate, endDate: c.endDate, branchId: c.branchId || "", notes: c.notes || "" })
    setShowContractModal(true)
  }

  async function handleSaveContract() {
    if (!contractForm.title.trim() || !contractForm.partyName.trim()) return
    setSaving(true)
    try {
      if (editingContract) {
        const res = await fetch(`/api/legal/contracts/${editingContract.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...contractForm,
            value: Number(contractForm.value) || 0,
            branchId: contractForm.branchId || null,
            notes: contractForm.notes || null,
          }),
        })
        if (!res.ok) throw new Error("Failed")
        toast("Contract updated.")
      } else {
        const res = await fetch("/api/legal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...contractForm,
            type: "contract",
            contractType: contractForm.type,
            value: Number(contractForm.value) || 0,
            branchId: contractForm.branchId || null,
            notes: contractForm.notes || null,
          }),
        })
        if (!res.ok) throw new Error("Failed")
        toast("Contract added.")
      }
      setShowContractModal(false)
      setContractForm(emptyContractForm)
      setEditingContract(null)
      fetchData()
    } catch {
      toast({ title: "Failed to save contract", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function deleteContract(id: string) {
    if (!confirm("Are you sure you want to delete this contract?")) return
    try {
      await fetch(`/api/legal/contracts/${id}`, { method: "DELETE" })
      toast({ title: "Contract deleted.", variant: "info" })
      fetchData()
    } catch {
      toast({ title: "Failed to delete", variant: "error" })
    }
  }

  function openAddCompliance() { setEditingCompliance(null); setComplianceForm(emptyComplianceForm); setShowComplianceModal(true) }
  function openEditCompliance(c: ComplianceItem) {
    setEditingCompliance(c)
    setComplianceForm({ title: c.title, description: c.description || "", category: c.category, dueDate: c.dueDate || "", assignedTo: c.assignedTo || "" })
    setShowComplianceModal(true)
  }

  async function handleSaveCompliance() {
    if (!complianceForm.title.trim()) return
    setSaving(true)
    try {
      if (editingCompliance) {
        const res = await fetch(`/api/legal/compliance/${editingCompliance.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...complianceForm,
            description: complianceForm.description || null,
            dueDate: complianceForm.dueDate || null,
            assignedTo: complianceForm.assignedTo || null,
          }),
        })
        if (!res.ok) throw new Error("Failed")
        toast("Compliance item updated.")
      } else {
        const res = await fetch("/api/legal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "compliance", ...complianceForm }),
        })
        if (!res.ok) throw new Error("Failed")
        toast("Compliance item added.")
      }
      setShowComplianceModal(false)
      setComplianceForm(emptyComplianceForm)
      setEditingCompliance(null)
      fetchData()
    } catch {
      toast({ title: "Failed to save compliance item", variant: "error" })
    } finally {
      setSaving(false)
    }
  }

  async function toggleCompliance(item: ComplianceItem) {
    const newStatus = item.status === "compliant" ? "pending" : "compliant"
    try {
      await fetch(`/api/legal/compliance/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, completedDate: newStatus === "compliant" ? new Date().toISOString().split("T")[0] : null }),
      })
      fetchData()
    } catch {
      toast({ title: "Failed to update", variant: "error" })
    }
  }

  async function deleteCompliance(id: string) {
    if (!confirm("Are you sure you want to remove this compliance item?")) return
    try {
      await fetch(`/api/legal/compliance/${id}`, { method: "DELETE" })
      toast({ title: "Compliance item removed.", variant: "info" })
      fetchData()
    } catch {
      toast({ title: "Failed to delete", variant: "error" })
    }
  }

  const stats = [
    { label: "Total Contracts", value: String(contracts.length), icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active", value: String(activeContracts), icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Pending / Expired", value: String(pendingContracts + expiredContracts), icon: Clock, color: "text-amber-500", bg: "bg-amber-50" },
    { label: "Compliance", value: compliance.length ? `${Math.round((complianceCompliant / compliance.length) * 100)}%` : "0%", icon: Shield, color: "text-purple-500", bg: "bg-purple-50" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal & Compliance"
        description="Contracts, permits, and regulatory compliance tracking"
        action={{ label: "Add Record", icon: Plus, onClick: openAddCompliance }}
      />

      <StatsGrid stats={stats} />

      {loading ? (
        <LoadingState message="Loading legal data..." />
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contracts & Documents</CardTitle>
              <Button variant="outline" size="sm" onClick={openAddContract}><Plus className="h-4 w-4 mr-1" />New Contract</Button>
            </CardHeader>
            <CardContent>
              {contracts.length === 0 ? (
                <EmptyState message="No contracts yet." action={{ label: "Add Contract", onClick: openAddContract }} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Contract</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Type</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Party</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Value</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">End Date</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {contracts.map((c) => (
                        <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">{c.title}</p>
                            {c.branch && <p className="text-xs text-slate-500">{c.branch.name}</p>}
                          </td>
                          <td className="py-3 px-4"><Badge variant="outline">{c.type}</Badge></td>
                          <td className="py-3 px-4 text-sm text-slate-500 max-w-xs truncate">{c.partyName}</td>
                          <td className="py-3 px-4 text-sm text-slate-700">{formatCurrency(c.value)}</td>
                          <td className="py-3 px-4">
                            <Badge variant={c.status === "active" ? "success" : c.status === "pending" ? "warning" : "secondary"}>{c.status}</Badge>
                          </td>
                          <td className="py-3 px-4 text-sm text-slate-700">{formatDate(c.endDate)}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-1">
                              <button onClick={() => openEditContract(c)} className="p-1.5 hover:bg-slate-100 rounded"><Pencil className="h-4 w-4 text-slate-500" /></button>
                              <button onClick={() => deleteContract(c.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-slate-500 hover:text-red-500" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Compliance Checklist</CardTitle>
                <Button variant="outline" size="sm" onClick={openAddCompliance}><Plus className="h-4 w-4 mr-1" />Add Item</Button>
              </CardHeader>
              <CardContent>
                {compliance.length === 0 ? (
                  <EmptyState message="No compliance items yet." />
                ) : (
                  <>
                    <div className="space-y-3">
                      {compliance.map((item) => (
                        <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                          <button onClick={() => toggleCompliance(item)} className={`flex h-6 w-6 items-center justify-center rounded-full ${item.status === "compliant" ? "bg-emerald-100" : item.status === "overdue" ? "bg-red-100" : "bg-slate-100"}`}>
                            {item.status === "compliant" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : item.status === "overdue" ? (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            ) : (
                              <div className="h-3 w-3 rounded-full border-2 border-slate-300" />
                            )}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className={`text-sm ${item.status === "compliant" ? "text-slate-500" : "text-slate-900 font-medium"}`}>{item.title}</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              {item.dueDate && <span className="text-xs text-slate-400">Due: {formatDate(item.dueDate)}</span>}
                            </div>
                          </div>
                          <button onClick={() => openEditCompliance(item)} className="p-1 hover:bg-slate-100 rounded">
                            <Pencil className="h-3.5 w-3.5 text-slate-400" />
                          </button>
                          <button onClick={() => deleteCompliance(item.id)} className="p-1 hover:bg-red-50 rounded">
                            <Trash2 className="h-3.5 w-3.5 text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm text-slate-500">{complianceCompliant} of {compliance.length} items compliant</span>
                      <div className="w-32 bg-slate-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${compliance.length ? (complianceCompliant / compliance.length) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      <span className="text-sm font-medium text-slate-900">Compliant</span>
                    </div>
                    <span className="text-lg font-bold text-emerald-600">{complianceCompliant}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-500" />
                      <span className="text-sm font-medium text-slate-900">Pending</span>
                    </div>
                    <span className="text-lg font-bold text-amber-600">{compliancePending}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                      <span className="text-sm font-medium text-slate-900">Overdue</span>
                    </div>
                    <span className="text-lg font-bold text-red-600">{complianceOverdue}</span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">Contracts by Status</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Active</span>
                      <span className="font-medium text-emerald-600">{activeContracts}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Pending</span>
                      <span className="font-medium text-amber-600">{pendingContracts}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Expired / Terminated</span>
                      <span className="font-medium text-red-600">{expiredContracts}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <CRUDModal open={showContractModal} onClose={() => { setShowContractModal(false); setContractForm(emptyContractForm); setEditingContract(null) }} onSave={handleSaveContract} saving={saving} title={editingContract ? "Edit Contract" : "New Contract"} disabled={!contractForm.title.trim() || !contractForm.partyName.trim()}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract Title *</label>
            <input type="text" value={contractForm.title} onChange={e => setContractForm(p => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Construction Agreement" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select value={contractForm.type} onChange={e => setContractForm(p => ({ ...p, type: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="service">Service</option>
                <option value="lease">Lease</option>
                <option value="vendor">Vendor</option>
                <option value="employment">Employment</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Value</label>
              <input type="number" value={contractForm.value} onChange={e => setContractForm(p => ({ ...p, value: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Other Party *</label>
            <input type="text" value={contractForm.partyName} onChange={e => setContractForm(p => ({ ...p, partyName: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Company or person name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" value={contractForm.startDate} onChange={e => setContractForm(p => ({ ...p, startDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" value={contractForm.endDate} onChange={e => setContractForm(p => ({ ...p, endDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={contractForm.notes} onChange={e => setContractForm(p => ({ ...p, notes: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" rows={3} placeholder="Additional notes..." />
          </div>
        </div>
      </CRUDModal>

      <CRUDModal open={showComplianceModal} onClose={() => { setShowComplianceModal(false); setComplianceForm(emptyComplianceForm); setEditingCompliance(null) }} onSave={handleSaveCompliance} saving={saving} title={editingCompliance ? "Edit Compliance Item" : "Add Compliance Record"} disabled={!complianceForm.title.trim()}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
            <input type="text" value={complianceForm.title} onChange={e => setComplianceForm(p => ({ ...p, title: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="e.g. Building Permit for Project X" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input type="text" value={complianceForm.description} onChange={e => setComplianceForm(p => ({ ...p, description: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Brief description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={complianceForm.category} onChange={e => setComplianceForm(p => ({ ...p, category: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="safety">Safety</option>
                <option value="environmental">Environmental</option>
                <option value="regulatory">Regulatory</option>
                <option value="financial">Financial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
              <input type="date" value={complianceForm.dueDate} onChange={e => setComplianceForm(p => ({ ...p, dueDate: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Assigned To</label>
            <input type="text" value={complianceForm.assignedTo} onChange={e => setComplianceForm(p => ({ ...p, assignedTo: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Person or team" />
          </div>
        </div>
      </CRUDModal>
      <ToastContainer />
    </div>
  )
}
