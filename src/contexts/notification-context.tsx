"use client"
import React, { createContext, useContext, useState, useCallback, useEffect } from "react"

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  refreshNotifications: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const refreshNotifications = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications")
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) setNotifications(data)
      }
    } catch {}
  }, [])

  useEffect(() => {
    refreshNotifications()
    const interval = setInterval(refreshNotifications, 30000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markAsRead = useCallback(async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    try {
      await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
    } catch {
      refreshNotifications()
    }
  }, [refreshNotifications])

  const markAllRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      })
    } catch {
      refreshNotifications()
    }
  }, [refreshNotifications])

  const deleteNotification = useCallback(async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" })
    } catch {
      refreshNotifications()
    }
  }, [refreshNotifications])

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, refreshNotifications, markAsRead, markAllRead, deleteNotification }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}
