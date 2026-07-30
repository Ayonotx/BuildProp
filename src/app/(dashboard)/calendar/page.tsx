"use client"

import React, { useEffect, useState, useCallback } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight,
  Plus, Edit, Trash2, MapPin, Users, X,
} from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/utils"

interface Appointment {
  id: string
  contactName: string
  contactEmail: string | null
  title: string
  description: string | null
  startTime: string
  endTime: string
  status: string
  eventType?: string
  location?: string
  participants?: string
  createdBy: string
  createdAt: string
}

const defaultForm = {
  title: "",
  date: "",
  startTime: "",
  endTime: "",
  eventType: "meeting",
  description: "",
  location: "",
  participants: "",
  status: "scheduled",
  contactName: "",
}

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const [showModal, setShowModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Appointment | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null)
  const [formData, setFormData] = useState(defaultForm)
  const [saving, setSaving] = useState(false)

  async function fetchData() {
    setLoading(true)
    try {
      const res = await fetch("/api/calendar")
      const data = await res.json()
      if (Array.isArray(data)) setAppointments(data)
    } catch { /* */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]

  const todayEvents = appointments.filter((a) => a.startTime.split("T")[0] === todayStr)
  const upcomingEvents = appointments.filter((a) => new Date(a.startTime) >= today).slice(0, 10)

  const daysWithEvents = new Set(
    appointments.map((a) => a.startTime.split("T")[0])
  )

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthName = currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" })

  function prevMonth() {
    setCurrentMonth(new Date(year, month - 1, 1))
  }
  function nextMonth() {
    setCurrentMonth(new Date(year, month + 1, 1))
  }
  function goToToday() {
    setCurrentMonth(new Date())
  }

  const formatTime = (val: string) => {
    if (!val) return ""
    const d = new Date(val)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  const fmtDate = (val: string) => {
    if (!val) return "\u2014"
    return formatDate(val)
  }

  const openNewEvent = useCallback((dateStr?: string) => {
    setEditingEvent(null)
    const d = dateStr || todayStr
    const now = new Date()
    const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    const endH = now.getHours() + 1
    const endTimeStr = `${String(endH > 23 ? 23 : endH).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    setFormData({
      ...defaultForm,
      date: d,
      startTime: timeStr,
      endTime: endTimeStr,
    })
    setShowModal(true)
  }, [todayStr])

  const openEditEvent = useCallback((event: Appointment) => {
    setEditingEvent(event)
    const d = new Date(event.startTime)
    const dateStr = d.toISOString().split("T")[0]
    const timeStr = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
    const e = new Date(event.endTime)
    const endTimeStr = `${String(e.getHours()).padStart(2, "0")}:${String(e.getMinutes()).padStart(2, "0")}`
    setFormData({
      title: event.title,
      date: dateStr,
      startTime: timeStr,
      endTime: endTimeStr,
      eventType: (event as any).eventType || "meeting",
      description: event.description || "",
      location: (event as any).location || "",
      participants: (event as any).participants || "",
      status: event.status,
      contactName: event.contactName || "",
    })
    setShowModal(true)
  }, [])

  const openEventDetail = useCallback((event: Appointment) => {
    setSelectedEvent(event)
    setShowDetailModal(true)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const startIso = formData.date && formData.startTime
        ? new Date(`${formData.date}T${formData.startTime}:00`).toISOString()
        : new Date().toISOString()
      const endIso = formData.date && formData.endTime
        ? new Date(`${formData.date}T${formData.endTime}:00`).toISOString()
        : startIso

      const payload = {
        title: formData.title,
        description: formData.description,
        startTime: startIso,
        endTime: endIso,
        status: formData.status,
        eventType: formData.eventType,
        location: formData.location,
        participants: formData.participants,
        contactName: formData.contactName,
      }

      const url = editingEvent ? `/api/calendar/${editingEvent.id}` : "/api/calendar"
      const method = editingEvent ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Failed")
      setShowModal(false)
      setEditingEvent(null)
      fetchData()
    } catch (err) {
      console.error("Error saving event:", err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this event?")) return
    try {
      await fetch(`/api/calendar/${id}`, { method: "DELETE" })
      setShowDetailModal(false)
      setSelectedEvent(null)
      fetchData()
    } catch (err) {
      console.error("Error deleting:", err)
    }
  }

  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay())
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  const eventsThisWeek = appointments.filter((a) => {
    const d = new Date(a.startTime)
    return d >= weekStart && d <= weekEnd
  })

  const upcomingDeadlines = appointments.filter((a) => {
    const d = new Date(a.startTime)
    return d >= today && a.eventType === "deadline"
  }).length

  const siteVisits = appointments.filter((a) => {
    const d = new Date(a.startTime)
    return d >= today && (a.eventType === "site_inspection" || a.eventType === "property_viewing")
  }).length

  const stats = [
    { label: "Events This Week", value: eventsThisWeek.length, icon: CalendarIcon, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Upcoming Deadlines", value: upcomingDeadlines, icon: Clock, color: "text-red-500", bg: "bg-red-50" },
    { label: "Site Visits Scheduled", value: siteVisits, icon: MapPin, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Total Events", value: appointments.length, icon: CalendarIcon, color: "text-purple-500", bg: "bg-purple-50" },
  ]

  const getEventsForDay = (dateStr: string) =>
    appointments.filter((a) => a.startTime.split("T")[0] === dateStr)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar & Scheduling"
        description="Manage meetings, inspections, and deadlines"
        action={{ label: "New Event", icon: Plus, onClick: () => openNewEvent() }}
      />

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>{monthName}</CardTitle>
                <Button variant="outline" size="sm" onClick={goToToday}>Today</Button>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="h-4 w-4" /></button>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="h-4 w-4" /></button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 mb-2">
                {days.map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-slate-500 py-2">{day}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }, (_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => {
                  const day = i + 1
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                  const isToday = dateStr === todayStr
                  const hasEvent = daysWithEvents.has(dateStr)
                  const dayEvents = getEventsForDay(dateStr)
                  return (
                    <div
                      key={i}
                      onClick={() => openNewEvent(dateStr)}
                      className={`text-center py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                        isToday ? "bg-orange-500 text-white font-bold" :
                        hasEvent ? "bg-blue-50 text-blue-600 font-medium hover:bg-blue-100" :
                        "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {day}
                      {hasEvent && (
                        <div className="flex justify-center gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map((ev, idx) => (
                            <div
                              key={idx}
                              onClick={(e) => { e.stopPropagation(); openEventDetail(ev) }}
                              className={`w-1 h-1 rounded-full ${isToday ? "bg-white" : "bg-blue-500"}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <LoadingState message="Loading..." />
            ) : (
              <div className="space-y-4">
                {upcomingEvents.length === 0 ? (
                  <EmptyState message="No upcoming appointments." />
                ) : upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => openEventDetail(event)}
                    className="p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-slate-900 text-sm">{event.title}</h4>
                      <Badge variant={
                        event.status === "completed" ? "success" :
                        event.status === "cancelled" ? "destructive" : "default"
                      }>{event.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mb-1">{event.contactName}</p>
                    <div className="space-y-1 text-xs text-slate-500">
                      <p className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {fmtDate(event.startTime)} | {formatTime(event.startTime)} - {formatTime(event.endTime)}
                      </p>
                      {(event as any).location && (
                        <p className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {(event as any).location}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{editingEvent ? "Edit Event" : "New Event"}</h2>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Title *</label>
                  <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Event title" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                    <input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                    <select value={formData.eventType} onChange={(e) => setFormData({ ...formData, eventType: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                      <option value="meeting">Meeting</option>
                      <option value="site_inspection">Site Inspection</option>
                      <option value="property_viewing">Property Viewing</option>
                      <option value="deadline">Deadline</option>
                      <option value="appointment">Appointment</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Start Time</label>
                    <input type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">End Time</label>
                    <input type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name</label>
                  <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Contact name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Location" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Participants</label>
                  <input type="text" value={formData.participants} onChange={(e) => setFormData({ ...formData, participants: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Comma-separated names" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" rows={3} placeholder="Event description" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-between">
              <div>
                {editingEvent && (
                  <Button variant="destructive" onClick={() => { handleDelete(editingEvent.id); setShowModal(false) }}>
                    <Trash2 className="h-4 w-4 mr-2" />Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !formData.title || !formData.date}>
                  {saving ? "Saving..." : editingEvent ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetailModal && selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Event Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-semibold text-slate-900">{selectedEvent.title}</h3>
                <Badge variant={
                  selectedEvent.status === "completed" ? "success" :
                  selectedEvent.status === "cancelled" ? "destructive" : "default"
                }>{selectedEvent.status}</Badge>
              </div>
              {selectedEvent.eventType && (
                <Badge variant="secondary" className="capitalize">{selectedEvent.eventType.replace(/_/g, " ")}</Badge>
              )}
              <div className="space-y-3 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-slate-400" />
                  <span>{fmtDate(selectedEvent.startTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>{formatTime(selectedEvent.startTime)} - {formatTime(selectedEvent.endTime)}</span>
                </div>
                {selectedEvent.contactName && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>{selectedEvent.contactName}</span>
                  </div>
                )}
                {(selectedEvent as any).location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-slate-400" />
                    <span>{(selectedEvent as any).location}</span>
                  </div>
                )}
                {(selectedEvent as any).participants && (
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span>{(selectedEvent as any).participants}</span>
                  </div>
                )}
              </div>
              {selectedEvent.description && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-sm text-slate-600">{selectedEvent.description}</p>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-200 flex justify-between">
              <Button variant="destructive" size="sm" onClick={() => handleDelete(selectedEvent.id)}>
                <Trash2 className="h-4 w-4 mr-1" />Delete
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>Close</Button>
                <Button size="sm" onClick={() => { setShowDetailModal(false); openEditEvent(selectedEvent) }}>
                  <Edit className="h-4 w-4 mr-1" />Edit
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
