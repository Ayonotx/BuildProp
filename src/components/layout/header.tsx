"use client"

import React, { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Avatar } from "@/components/ui/avatar"
import { Bell, Search, ChevronDown, DollarSign, Clock, AlertTriangle, CheckCircle, Settings, HelpCircle, Check, LogOut, KeyRound, X, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useNotifications } from "@/contexts/notification-context"
import { useToast } from "@/components/dashboard/toast"

interface HeaderProps {
  sidebarCollapsed?: boolean
}

interface UserInfo {
  firstName?: string
  lastName?: string
  role?: { name?: string }
}

function relativeTime(dateStr: string) {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
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

function Header({ sidebarCollapsed }: HeaderProps) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<{ type: string; label: string; href: string }[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const [searching, setSearching] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const notifDropdownRef = useRef<HTMLDivElement>(null)
  const userDropdownRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { notifications, unreadCount, markAsRead } = useNotifications()
  const { toast } = useToast()

  useEffect(() => {
    try {
      const raw = localStorage.getItem("buildprop_user")
      if (raw) setUser(JSON.parse(raw))
    } catch {}
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        setShowNotifDropdown(false)
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setShowUserDropdown(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearch(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } catch {}
    localStorage.removeItem("buildprop_user")
    localStorage.removeItem("buildprop_user_ui")
    router.push("/login")
  }

  function openChangePassword() {
    setPasswordError(null)
    setCurrentPassword("")
    setNewPassword("")
    setConfirmNewPassword("")
    setShowUserDropdown(false)
    setShowChangePassword(true)
  }

  async function handleChangePassword() {
    setPasswordError(null)
    if (!currentPassword) {
      setPasswordError("Current password is required")
      return
    }
    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError("New passwords do not match")
      return
    }
    setSavingPassword(true)
    try {
      const res = await fetch("/api/me/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      const data = await res.json()
      if (!res.ok) {
        setPasswordError(data.error || "Failed to change password")
        setSavingPassword(false)
        return
      }
      setShowChangePassword(false)
      toast({ title: "Password changed", description: "Your password has been updated successfully", variant: "success" })
    } catch {
      setPasswordError("Network error")
    } finally {
      setSavingPassword(false)
    }
  }

  async function handleSearch(query: string) {
    if (!query.trim()) { setShowSearch(false); return }
    setSearching(true)
    try {
      const [projects, properties, contacts] = await Promise.all([
        fetch("/api/projects").then(r => r.json()).catch(() => []),
        fetch("/api/properties").then(r => r.json()).catch(() => []),
        fetch("/api/contacts").then(r => r.json()).catch(() => []),
      ])
      const q = query.toLowerCase()
      const results: { type: string; label: string; href: string }[] = []
      if (Array.isArray(projects)) {
        projects.filter((p: any) => p.name?.toLowerCase().includes(q)).forEach((p: any) =>
          results.push({ type: "Project", label: p.name, href: "/projects" })
        )
      }
      if (Array.isArray(properties)) {
        properties.filter((p: any) => p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)).forEach((p: any) =>
          results.push({ type: "Property", label: p.name || p.address, href: "/properties" })
        )
      }
      if (Array.isArray(contacts)) {
        contacts.filter((c: any) => {
          const fullName = `${c.firstName || ''} ${c.lastName || ''}`.toLowerCase()
          return fullName.includes(q) || c.email?.toLowerCase().includes(q)
        }).forEach((c: any) =>
          results.push({ type: "Contact", label: `${c.firstName} ${c.lastName}` || c.email, href: "/crm" })
        )
      }
      setSearchResults(results.slice(0, 10))
      setShowSearch(true)
    } catch {
      setSearchResults([])
      setShowSearch(true)
    } finally {
      setSearching(false)
    }
  }

  const displayName = user?.firstName && user?.lastName
    ? `${user.firstName} ${user.lastName}`
    : "Admin"
  const roleName = user?.role?.name || "Administrator"
  const initials = user?.firstName && user?.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : "AD"

  const recentNotifications = notifications.slice(0, 5)

  return (
    <>
      {process.env.NODE_ENV === "development" && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-1.5 text-center text-xs text-amber-700 font-medium">
          Demo Mode — Seeded with realistic sample data
        </div>
      )}
      <header data-tutorial-header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-6">
      <div className="lg:hidden w-10" />

      <div className="flex-1 max-w-md" ref={searchRef}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Search projects, properties, clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(searchQuery) }}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-colors"
          />
          {showSearch && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="max-h-80 overflow-y-auto">
                {searching ? (
                  <div className="py-8 text-center text-sm text-slate-400">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No results found</div>
                ) : searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { setShowSearch(false); setSearchQuery(""); router.push(r.href) }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                  >
                    <span className="text-xs font-medium text-orange-500 bg-orange-50 rounded px-1.5 py-0.5">{r.type}</span>
                    <span className="text-sm text-slate-700 truncate">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            localStorage.removeItem("buildprop_tutorial_done")
            window.location.reload()
          }}
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          title="Replay Tutorial"
        >
          <HelpCircle className="h-5 w-5" />
        </button>

        <div className="relative" ref={notifDropdownRef}>
          <button
            onClick={() => { setShowNotifDropdown(!showNotifDropdown); setShowUserDropdown(false) }}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                {unreadCount > 0 && <span className="text-xs text-orange-500 font-medium">{unreadCount} unread</span>}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {recentNotifications.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">No notifications</div>
                ) : recentNotifications.map(n => {
                  const { icon: NotifIcon, color, bg } = iconForType(n.type)
                  return (
                    <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0", !n.isRead && "bg-orange-50/30")}>
                      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5", bg)}>
                        <NotifIcon className={cn("h-4 w-4", color)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">{n.title}</p>
                          {!n.isRead && <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />}
                        </div>
                        {n.message && <p className="text-xs text-slate-500 truncate mt-0.5">{n.message}</p>}
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] text-slate-400">{relativeTime(n.createdAt)}</span>
                          {!n.isRead && (
                            <button onClick={() => markAsRead(n.id)} className="text-[11px] text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
                              <Check className="h-3 w-3" />Mark read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
                <button
                  onClick={() => { setShowNotifDropdown(false); router.push("/notifications") }}
                  className="w-full text-center text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
                >
                  View All Notifications
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userDropdownRef}>
          <button
            onClick={() => { setShowUserDropdown(!showUserDropdown); setShowNotifDropdown(false) }}
            className="flex items-center gap-3 rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Avatar fallback={initials} size="sm" />
            <div className="hidden md:block">
              <p className="text-sm font-medium text-slate-900">{displayName}</p>
              <p className="text-[11px] text-slate-500">{roleName}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {showUserDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50 py-1">
              <button
                onClick={openChangePassword}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <KeyRound className="h-4 w-4 text-slate-400" />
                Change Password
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={() => { setShowUserDropdown(false); handleLogout() }}
                className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>

      {/* Change Password modal */}
      {showChangePassword && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={() => !savingPassword && setShowChangePassword(false)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
              <button onClick={() => setShowChangePassword(false)} disabled={savingPassword} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">New Password (min 8 characters)</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                />
              </div>
              {passwordError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                  {passwordError}
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
              <button
                onClick={() => setShowChangePassword(false)}
                disabled={savingPassword}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleChangePassword}
                disabled={savingPassword}
                className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                {savingPassword && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {savingPassword ? "Updating..." : "Update Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export { Header }
