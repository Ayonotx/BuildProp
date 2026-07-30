"use client"

import React, { useEffect, useState, useCallback } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Search, RefreshCw, Shield, Filter } from "lucide-react"

interface AuditEntry {
  id: string
  timestamp: string
  userId: string
  action: string
  resource: string
  details: string
  ipAddress?: string
}

const actionColors: Record<string, string> = {
  login: "bg-emerald-100 text-emerald-700",
  logout: "bg-slate-100 text-slate-600",
  create: "bg-blue-100 text-blue-700",
  update: "bg-amber-100 text-amber-700",
  delete: "bg-red-100 text-red-700",
  settings_change: "bg-purple-100 text-purple-700",
  backup: "bg-cyan-100 text-cyan-700",
  restore: "bg-orange-100 text-orange-700",
}

const actionTypes = ["all", "login", "logout", "create", "update", "delete", "settings_change", "backup", "restore"]

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [actionFilter, setActionFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/audit")
      const data = await res.json()
      if (Array.isArray(data)) setEntries(data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchEntries()
    const interval = setInterval(fetchEntries, 30000)
    return () => clearInterval(interval)
  }, [fetchEntries])

  const filtered = entries.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false
    if (search) {
      const q = search.toLowerCase()
      const matches =
        e.details.toLowerCase().includes(q) ||
        e.userId.toLowerCase().includes(q) ||
        e.resource.toLowerCase().includes(q)
      if (!matches) return false
    }
    if (dateFrom) {
      const entryDate = new Date(e.timestamp).getTime()
      if (entryDate < new Date(dateFrom).getTime()) return false
    }
    if (dateTo) {
      const entryDate = new Date(e.timestamp).getTime()
      if (entryDate > new Date(dateTo + "T23:59:59").getTime()) return false
    }
    return true
  })

  const totalLogins = entries.filter((e) => e.action === "login").length
  const totalChanges = entries.filter((e) => ["create", "update", "delete"].includes(e.action)).length
  const totalBackups = entries.filter((e) => ["backup", "restore"].includes(e.action)).length
  const totalSettingsChanges = entries.filter((e) => e.action === "settings_change").length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Track all system activity and user actions"
        action={
          <Button onClick={fetchEntries} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Entries", value: entries.length, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Logins", value: totalLogins, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Changes", value: totalChanges, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Backups", value: totalBackups, color: "text-purple-600", bg: "bg-purple-50" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <Shield className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-xs text-slate-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-medium text-slate-600 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  placeholder="Search details, user, resource..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              >
                {actionTypes.map((t) => (
                  <option key={t} value={t}>{t === "all" ? "All Actions" : t.replace("_", " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log ({filtered.length} entries)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <LoadingState message="Loading audit log..." />
          ) : filtered.length === 0 ? (
            <EmptyState message="No audit entries found." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Timestamp</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">User</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Action</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Resource</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium text-slate-900">{entry.userId}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${actionColors[entry.action] || "bg-slate-100 text-slate-600"}`}>
                          {entry.action.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 capitalize">{entry.resource}</td>
                      <td className="py-3 px-4 text-sm text-slate-500 max-w-xs truncate">{entry.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
