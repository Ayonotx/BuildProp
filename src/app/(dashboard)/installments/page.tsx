"use client"

import React, { useEffect, useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Plus, CreditCard, DollarSign, TrendingUp, Clock, CheckCircle,
  AlertCircle, Calendar, Pencil, Trash2, ChevronRight, X
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"

interface InstallmentPlan {
  id: string
  saleId: string
  totalAmount: string
  numberOfPayments: number
  frequency: string
  startDate: string
  status: string
  createdAt: string
  installments: Installment[]
  propertyName: string
  buyerName: string
}

interface Installment {
  id: string
  planId: string
  installmentNumber: number
  amount: string
  dueDate: string
  paidDate: string | null
  paidAmount: string
  status: string
  notes: string | null
}

interface Sale {
  id: string
  saleNumber: string
  propertyName: string
  buyerName: string
  salePrice: string
}

const defaultForm = {
  saleId: "",
  totalAmount: "",
  numberOfPayments: "",
  frequency: "monthly",
  startDate: new Date().toISOString().split("T")[0],
}

export default function InstallmentsPage() {
  const [plans, setPlans] = useState<InstallmentPlan[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<InstallmentPlan | null>(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [payForm, setPayForm] = useState({ installmentId: "", paidAmount: "", paidDate: new Date().toISOString().split("T")[0], notes: "" })

  async function fetchData() {
    setLoading(true)
    try {
      const [plansRes, salesRes] = await Promise.all([
        fetch("/api/installments"),
        fetch("/api/sales"),
      ])
      const plansData = await plansRes.json()
      const salesData = await salesRes.json()
      if (Array.isArray(plansData)) setPlans(plansData)
      if (Array.isArray(salesData)) setSales(salesData)
    } catch { /* */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  async function handleCreate() {
    if (!formData.saleId || !formData.totalAmount || !formData.numberOfPayments || !formData.startDate) return
    setSaving(true)
    try {
      const res = await fetch("/api/installments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          totalAmount: Number(formData.totalAmount),
          numberOfPayments: Number(formData.numberOfPayments),
        }),
      })
      if (!res.ok) throw new Error("Failed")
      setShowModal(false)
      setFormData(defaultForm)
      fetchData()
    } catch { /* */ } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this plan?")) return
    try {
      await fetch(`/api/installments/${id}`, { method: "DELETE" })
      setSelectedPlan(null)
      fetchData()
    } catch { /* */ }
  }

  async function handlePayInstallment() {
    if (!payForm.installmentId || !payForm.paidAmount) return
    setSaving(true)
    try {
      const res = await fetch(`/api/installments/${selectedPlan!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId: payForm.installmentId,
          status: "paid",
          paidAmount: Number(payForm.paidAmount),
          paidDate: payForm.paidDate,
          notes: payForm.notes,
        }),
      })
      if (!res.ok) throw new Error("Failed")
      setShowPayModal(false)
      setPayForm({ installmentId: "", paidAmount: "", paidDate: new Date().toISOString().split("T")[0], notes: "" })
      fetchData()
      const updated = await fetch(`/api/installments/${selectedPlan!.id}`).then((r) => r.json())
      setSelectedPlan(updated)
    } catch { /* */ } finally {
      setSaving(false)
    }
  }

  function openPayModal(inst: Installment) {
    setPayForm({
      installmentId: inst.id,
      paidAmount: inst.amount,
      paidDate: new Date().toISOString().split("T")[0],
      notes: "",
    })
    setShowPayModal(true)
  }

  const totalPlans = plans.length
  const activePlans = plans.filter((p) => p.status === "active").length
  const totalValue = plans.reduce((sum, p) => sum + Number(p.totalAmount), 0)
  const totalCollected = plans.reduce((sum, p) =>
    sum + p.installments.reduce((s, i) => s + Number(i.paidAmount), 0), 0
  )
  const totalOutstanding = totalValue - totalCollected

  const stats = [
    { label: "Total Plans", value: totalPlans, icon: CreditCard, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Active Plans", value: activePlans, icon: Clock, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Total Value", value: formatCurrency(totalValue), icon: DollarSign, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Collected", value: formatCurrency(totalCollected), icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Outstanding", value: formatCurrency(totalOutstanding), icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
  ]

  function getPlanStatusColor(status: string) {
    if (status === "completed") return "success"
    if (status === "defaulted") return "destructive"
    return "warning"
  }

  function getInstStatusColor(status: string) {
    if (status === "paid") return "bg-green-100 text-green-700"
    if (status === "overdue") return "bg-red-100 text-red-700"
    return "bg-yellow-100 text-yellow-700"
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Installment Payment Schedules"
        description="Manage installment plans and track payments"
        action={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4 mr-2" />Create Plan
          </Button>
        }
      />

      <StatsGrid stats={stats} />

      {loading ? (
        <LoadingState message="Loading installment plans..." />
      ) : plans.length === 0 ? (
        <EmptyState message="No installment plans yet. Create your first plan!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const paidCount = plan.installments.filter((i) => i.status === "paid").length
            const collected = plan.installments.reduce((s, i) => s + Number(i.paidAmount), 0)
            const progress = Number(plan.totalAmount) > 0 ? (collected / Number(plan.totalAmount)) * 100 : 0

            return (
              <Card
                key={plan.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedPlan(plan)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{plan.propertyName}</h3>
                      <p className="text-sm text-slate-500">{plan.buyerName}</p>
                    </div>
                    <Badge variant={getPlanStatusColor(plan.status) as any}>{plan.status}</Badge>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Total</span>
                      <span className="font-medium">{formatCurrency(plan.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Collected</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(String(collected))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Payments</span>
                      <span className="font-medium">{paidCount}/{plan.numberOfPayments}</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Calendar className="h-3 w-3" />
                      {plan.frequency} | Start: {formatDate(plan.startDate)}
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      <CRUDModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Create Installment Plan"
        onSave={handleCreate}
        saving={saving}
        disabled={!formData.saleId || !formData.totalAmount || !formData.numberOfPayments || !formData.startDate}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Sale *</label>
            <select
              value={formData.saleId}
              onChange={(e) => {
                const sale = sales.find((s) => s.id === e.target.value)
                setFormData({
                  ...formData,
                  saleId: e.target.value,
                  totalAmount: sale ? sale.salePrice : formData.totalAmount,
                })
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            >
              <option value="">Select sale</option>
              {sales.map((s) => (
                <option key={s.id} value={s.id}>{s.saleNumber} - {s.propertyName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Amount *</label>
            <input
              type="number"
              value={formData.totalAmount}
              onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Number of Payments *</label>
            <input
              type="number"
              value={formData.numberOfPayments}
              onChange={(e) => setFormData({ ...formData, numberOfPayments: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              placeholder="12"
              min="1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Frequency *</label>
            <select
              value={formData.frequency}
              onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="custom">Custom (30-day intervals)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date *</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
            />
          </div>
        </div>
      </CRUDModal>

      {/* Plan Detail Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setSelectedPlan(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedPlan.propertyName}</h2>
                <p className="text-sm text-slate-500">{selectedPlan.buyerName} | {selectedPlan.frequency} payments</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedPlan.id)}>
                  <Trash2 className="h-4 w-4 mr-1" />Delete
                </Button>
                <button onClick={() => setSelectedPlan(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-400">Total Amount</p>
                  <p className="text-lg font-bold">{formatCurrency(selectedPlan.totalAmount)}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-slate-400">Collected</p>
                  <p className="text-lg font-bold text-green-600">
                    {formatCurrency(String(
                      selectedPlan.installments.reduce((s, i) => s + Number(i.paidAmount), 0)
                    ))}
                  </p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-slate-400">Outstanding</p>
                  <p className="text-lg font-bold text-orange-600">
                    {formatCurrency(String(
                      Number(selectedPlan.totalAmount) - selectedPlan.installments.reduce((s, i) => s + Number(i.paidAmount), 0)
                    ))}
                  </p>
                </div>
              </div>

              <h3 className="font-medium text-slate-900 mb-3">Payment Schedule</h3>
              <div className="space-y-2">
                {selectedPlan.installments.map((inst) => (
                  <div key={inst.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${getInstStatusColor(inst.status)}`}>
                      {inst.installmentNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-slate-900">{formatCurrency(inst.amount)}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${getInstStatusColor(inst.status)}`}>
                          {inst.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">Due: {formatDate(inst.dueDate)}</p>
                      {inst.paidDate && (
                        <p className="text-xs text-green-600">Paid: {formatDate(inst.paidDate)}</p>
                      )}
                    </div>
                    {inst.status !== "paid" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); openPayModal(inst) }}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />Pay
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay Installment Modal */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowPayModal(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Record Payment</h2>
              <button onClick={() => setShowPayModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount *</label>
                <input
                  type="number"
                  value={payForm.paidAmount}
                  onChange={(e) => setPayForm({ ...payForm, paidAmount: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Date *</label>
                <input
                  type="date"
                  value={payForm.paidDate}
                  onChange={(e) => setPayForm({ ...payForm, paidDate: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                <textarea
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
                  placeholder="Optional notes..."
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowPayModal(false)}>Cancel</Button>
                <Button onClick={handlePayInstallment} disabled={saving || !payForm.paidAmount}>
                  {saving ? "Saving..." : "Record Payment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
