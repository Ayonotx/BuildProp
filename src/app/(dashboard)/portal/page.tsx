"use client"

import React, { useState, useEffect } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { useToast, ToastContainer } from "@/components/dashboard/toast"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Activity, Building2, FileText, DollarSign, Wrench, Clock, Save } from "lucide-react"

interface PortalFeature {
  name: string
  description: string
  enabled: boolean
  icon: typeof Building2
}

const STORAGE_KEY = "buildprop_portal_settings"

const defaultFeatures: PortalFeature[] = [
  { name: "Property Viewing", description: "Browse and view available properties with details and media", enabled: true, icon: Building2 },
  { name: "Payment History", description: "View and download payment receipts and invoices", enabled: true, icon: DollarSign },
  { name: "Document Access", description: "Access contracts, titles, and legal documents", enabled: true, icon: FileText },
  { name: "Maintenance Requests", description: "Submit and track maintenance requests", enabled: true, icon: Wrench },
]

interface PortalSettings {
  portalEnabled: boolean
  allowRegistration: boolean
  requireApproval: boolean
  features: { name: string; enabled: boolean }[]
}

const defaultSettings: PortalSettings = {
  portalEnabled: true,
  allowRegistration: true,
  requireApproval: true,
  features: defaultFeatures.map(f => ({ name: f.name, enabled: f.enabled })),
}

const recentActivity = [
  { id: 1, user: "John Smith", action: "Logged in", time: "5 min ago", type: "login" },
  { id: 2, user: "Sarah Williams", action: "Viewed property listing", time: "12 min ago", type: "view" },
  { id: 3, user: "Mike Johnson", action: "Downloaded invoice INV-2024-007", time: "1 hour ago", type: "download" },
  { id: 4, user: "Emily Davis", action: "Submitted maintenance request", time: "2 hours ago", type: "request" },
  { id: 5, user: "Robert Taylor", action: "Made payment of GH₵ 45,000", time: "3 hours ago", type: "payment" },
  { id: 6, user: "Anna Brown", action: "Viewed property listing", time: "5 hours ago", type: "view" },
]

const statsData = [
  { label: "Active Portal Users", value: "142", icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
  { label: "Logins Today", value: "38", icon: Activity, color: "text-emerald-500", bg: "bg-emerald-50" },
  { label: "Properties Viewed", value: "267", icon: Building2, color: "text-orange-500", bg: "bg-orange-50" },
  { label: "Support Tickets", value: "5", icon: Wrench, color: "text-purple-500", bg: "bg-purple-50" },
]

export default function PortalPage() {
  const [portalEnabled, setPortalEnabled] = useState(true)
  const [allowRegistration, setAllowRegistration] = useState(true)
  const [requireApproval, setRequireApproval] = useState(true)
  const [features, setFeatures] = useState<PortalFeature[]>(defaultFeatures)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed: PortalSettings = JSON.parse(raw)
        setPortalEnabled(parsed.portalEnabled)
        setAllowRegistration(parsed.allowRegistration)
        setRequireApproval(parsed.requireApproval)
        if (parsed.features) {
          setFeatures(prev => prev.map(f => {
            const saved = parsed.features.find(sf => sf.name === f.name)
            return saved ? { ...f, enabled: saved.enabled } : f
          }))
        }
      }
    } catch {}
  }, [])

  function toggleFeature(index: number) {
    setFeatures(prev => prev.map((f, i) => i === index ? { ...f, enabled: !f.enabled } : f))
  }

  async function handleSave() {
    setSaving(true)
    const settings: PortalSettings = {
      portalEnabled,
      allowRegistration,
      requireApproval,
      features: features.map(f => ({ name: f.name, enabled: f.enabled })),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    toast("Portal settings saved.")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader title="Customer Self-Service Portal" description="Configure portal access, features, and registration settings" />
        <div className="flex items-center gap-3">
          {!portalEnabled && (
            <Badge variant="warning">Portal Disabled</Badge>
          )}
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors">
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>

      <StatsGrid stats={statsData} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Portal Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 rounded-lg border border-slate-100">
                <div>
                  <p className="font-medium text-slate-900">Enable Portal</p>
                  <p className="text-sm text-slate-500">Allow customers to access the self-service portal</p>
                </div>
                <button onClick={() => setPortalEnabled(!portalEnabled)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${portalEnabled ? "bg-orange-500" : "bg-slate-200"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${portalEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-lg border border-slate-100 transition-opacity ${!portalEnabled ? "opacity-50" : ""}`}>
                <div>
                  <p className="font-medium text-slate-900">Allow Registration</p>
                  <p className="text-sm text-slate-500">Let new customers register for portal access</p>
                </div>
                <button onClick={() => setAllowRegistration(!allowRegistration)} disabled={!portalEnabled} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${allowRegistration ? "bg-orange-500" : "bg-slate-200"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${allowRegistration ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
              <div className={`flex items-center justify-between p-3 rounded-lg border border-slate-100 transition-opacity ${!portalEnabled ? "opacity-50" : ""}`}>
                <div>
                  <p className="font-medium text-slate-900">Require Admin Approval</p>
                  <p className="text-sm text-slate-500">New registrations must be approved by an admin</p>
                </div>
                <button onClick={() => setRequireApproval(!requireApproval)} disabled={!portalEnabled} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${requireApproval ? "bg-orange-500" : "bg-slate-200"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${requireApproval ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Feature Access</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {features.map((f, idx) => {
                const Icon = f.icon
                return (
                  <div key={f.name} className={`flex items-center gap-3 p-3 rounded-lg border border-slate-100 transition-opacity ${!portalEnabled ? "opacity-50" : ""}`}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 shrink-0">
                      <Icon className="h-5 w-5 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-slate-900">{f.name}</p>
                        <button onClick={() => toggleFeature(idx)} disabled={!portalEnabled} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${f.enabled ? "bg-orange-500" : "bg-slate-200"}`}>
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${f.enabled ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </div>
                      <p className="text-sm text-slate-500 truncate">{f.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Portal Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 shrink-0">
                  <span className="text-xs font-medium text-slate-600">
                    {a.user.split(" ").map(n => n[0]).join("")}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">{a.user}</span>{" "}
                    <span className="text-slate-500">{a.action}</span>
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                  <Clock className="h-3 w-3" />
                  {a.time}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <ToastContainer />
    </div>
  )
}
