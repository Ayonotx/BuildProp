"use client"

import React, { useState } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bell, DollarSign, Clock, AlertTriangle, CheckCircle, Settings, Trash2, Check } from "lucide-react"
import { useNotifications } from "@/contexts/notification-context"
import { formatDate } from "@/lib/utils"

function relativeTime(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`
  return formatDate(dateStr)
}

function iconForType(type: string) {
  switch (type) {
    case "payment": return { icon: DollarSign, color: "text-emerald-500", bg: "bg-emerald-50" }
    case "deadline": return { icon: Clock, color: "text-orange-500", bg: "bg-orange-50" }
    case "stock": return { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" }
    case "task": return { icon: CheckCircle, color: "text-blue-500", bg: "bg-blue-50" }
    case "maintenance": return { icon: Settings, color: "text-purple-500", bg: "bg-purple-50" }
    default: return { icon: Bell, color: "text-cyan-500", bg: "bg-cyan-50" }
  }
}

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllRead, deleteNotification } = useNotifications()
  const [filter, setFilter] = useState<"all" | "unread">("all")

  const unreadCount = notifications.filter(n => !n.isRead).length
  const readCount = notifications.filter(n => n.isRead).length

  const stats = [
    { label: "Total", value: notifications.length, icon: Bell, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Unread", value: unreadCount, icon: Bell, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Read", value: readCount, icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Alerts", value: notifications.filter(n => n.type === "stock" || n.type === "deadline").length, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  ]

  const filtered = notifications.filter(n => filter === "all" || !n.isRead)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Stay updated on all system activities"
        actions={[{ label: "Mark All Read", icon: Check, onClick: markAllRead, variant: "outline" }]}
      />

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Notifications</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant={filter === "all" ? "default" : "outline"} size="sm" onClick={() => setFilter("all")}>All</Button>
            <Button variant={filter === "unread" ? "default" : "outline"} size="sm" onClick={() => setFilter("unread")}>Unread</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <EmptyState message="No notifications to display." />
            ) : filtered.map((n) => {
              const { icon: NotifIcon, color, bg } = iconForType(n.type)
              return (
                <div key={n.id} className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${!n.isRead ? "bg-orange-50/50 border border-orange-100" : "border border-slate-100 hover:bg-slate-50"}`}>
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bg} shrink-0`}>
                    <NotifIcon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{n.title}</p>
                      {!n.isRead && <div className="h-2 w-2 rounded-full bg-orange-500" />}
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{n.message || ""}</p>
                    <p className="text-xs text-slate-400 mt-1">{relativeTime(n.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!n.isRead && (
                      <button onClick={() => markAsRead(n.id)} className="p-2 hover:bg-slate-100 rounded-lg" title="Mark as read">
                        <Check className="h-4 w-4 text-slate-500" />
                      </button>
                    )}
                    <button onClick={() => deleteNotification(n.id)} className="p-2 hover:bg-slate-100 rounded-lg" title="Delete">
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
