"use client"

import React, { useEffect, useState, useMemo } from "react"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { useToast, ToastContainer } from "@/components/dashboard/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, MessageSquare, Mail, Phone, Search, Send, FileText, StickyNote, Clock, X, ChevronRight } from "lucide-react"
import { formatDate, formatDateTime } from "@/lib/utils"

interface Communication {
  id: string
  contactName: string
  contactEmail: string | null
  contactPhone: string | null
  type: string
  direction: string
  subject: string | null
  content: string | null
  createdBy: string
  createdAt: string
}

interface Thread {
  name: string
  lastMessage: Communication
  count: number
  messages: Communication[]
}

interface Template {
  id: string
  name: string
  content: string
}

const defaultTemplates: Template[] = [
  {
    id: "payment-reminder",
    name: "Payment Reminder",
    content: "Hi [name], this is a reminder that your payment of [amount] is due on [date].",
  },
  {
    id: "site-update",
    name: "Site Update",
    content: "Construction at [project] is progressing as scheduled.",
  },
  {
    id: "follow-up",
    name: "Follow Up",
    content: "Following up on our previous conversation regarding [topic].",
  },
]

const defaultCompose = {
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  type: "email",
  direction: "outbound",
  subject: "",
  content: "",
}

export default function CommunicationPage() {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [compose, setCompose] = useState(defaultCompose)
  const [sending, setSending] = useState(false)
  const [showCompose, setShowCompose] = useState(false)
  const [selectedThread, setSelectedThread] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [templates, setTemplates] = useState<Template[]>([])
  const [showTemplates, setShowTemplates] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const stored = localStorage.getItem("buildprop_msg_templates")
    if (stored) {
      try { setTemplates(JSON.parse(stored)) } catch { setTemplates(defaultTemplates) }
    } else {
      setTemplates(defaultTemplates)
    }
  }, [])

  function saveTemplates(newTemplates: Template[]) {
    setTemplates(newTemplates)
    localStorage.setItem("buildprop_msg_templates", JSON.stringify(newTemplates))
  }

  function fetchCommunications() {
    setLoading(true)
    fetch("/api/communications").then(r => r.json()).then(d => { if (Array.isArray(d)) setCommunications(d) }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { fetchCommunications() }, [])

  async function handleSend() {
    if (!compose.contactName.trim()) return
    setSending(true)
    try {
      const res = await fetch("/api/communications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compose),
      })
      if (res.ok) {
        toast("Message sent successfully.")
        setCompose(defaultCompose)
        setShowCompose(false)
        fetchCommunications()
      } else {
        toast({ title: "Failed to send message.", variant: "error" })
      }
    } catch {
      toast({ title: "Failed to send message.", variant: "error" })
    } finally {
      setSending(false)
    }
  }

  function applyTemplate(template: Template) {
    setCompose((p) => ({ ...p, content: template.content }))
    setShowTemplates(false)
  }

  const threads = useMemo(() => {
    const map = new Map<string, Communication[]>()
    communications.forEach((c) => {
      const key = c.contactName || "Unknown"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    })
    return Array.from(map.entries())
      .map(([name, msgs]) => ({
        name,
        lastMessage: msgs[0],
        count: msgs.length,
        messages: msgs,
      }))
      .sort((a, b) => new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime())
  }, [communications])

  const filteredThreads = useMemo(() => {
    if (!search.trim()) return threads
    const q = search.toLowerCase()
    return threads.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.messages.some(
          (m) =>
            (m.content && m.content.toLowerCase().includes(q)) ||
            (m.subject && m.subject.toLowerCase().includes(q))
        )
    )
  }, [threads, search])

  const selected = selectedThread ? threads.find((t) => t.name === selectedThread) : null

  const calls = communications.filter((c) => c.type === "call").length
  const emails = communications.filter((c) => c.type === "email").length
  const notes = communications.filter((c) => c.type === "meeting").length

  const formatTime = (val: string) => {
    if (!val) return ""
    return formatDateTime(val)
  }

  const stats = [
    { label: "Total Messages", value: communications.length, icon: MessageSquare, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Emails Sent", value: emails, icon: Mail, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Calls Logged", value: calls, icon: Phone, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Notes", value: notes, icon: StickyNote, color: "text-purple-500", bg: "bg-purple-50" },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Communication Hub"
        description="Conversations, templates, and messaging"
        action={
          <Button onClick={() => setShowCompose(!showCompose)}>
            <Plus className="h-4 w-4 mr-2" />
            {showCompose ? "Close" : "New Message"}
          </Button>
        }
      />

      {showCompose && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Compose Message</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowTemplates(!showTemplates)}>
                <FileText className="h-4 w-4 mr-1" />
                Templates
              </Button>
            </div>
            {showTemplates && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 mt-2">
                {templates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => applyTemplate(t)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-orange-50 hover:border-orange-300 transition-colors"
                  >
                    <FileText className="h-3 w-3" />
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Name *</label>
                  <input type="text" value={compose.contactName} onChange={e => setCompose(p => ({ ...p, contactName: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Recipient name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input type="email" value={compose.contactEmail} onChange={e => setCompose(p => ({ ...p, contactEmail: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="email@example.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                  <input type="tel" value={compose.contactPhone} onChange={e => setCompose(p => ({ ...p, contactPhone: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="+233..." />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                  <select value={compose.type} onChange={e => setCompose(p => ({ ...p, type: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                    <option value="email">Email</option>
                    <option value="call">Call</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Direction</label>
                  <select value={compose.direction} onChange={e => setCompose(p => ({ ...p, direction: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input type="text" value={compose.subject} onChange={e => setCompose(p => ({ ...p, subject: e.target.value }))} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Message subject" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message Content</label>
                <textarea value={compose.content} onChange={e => setCompose(p => ({ ...p, content: e.target.value }))} rows={4} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" placeholder="Write your message here..." />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSend} disabled={sending || !compose.contactName.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[500px]">
        {/* Thread List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Conversations</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                placeholder="Search contacts or messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4"><LoadingState message="Loading..." /></div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-4"><EmptyState message={search ? "No matches found." : "No conversations yet."} /></div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredThreads.map((thread) => (
                  <button
                    key={thread.name}
                    onClick={() => setSelectedThread(thread.name)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                      selectedThread === thread.name ? "bg-orange-50 border-l-2 border-orange-500" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                          {thread.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-slate-900 truncate">{thread.name}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {thread.lastMessage.content || thread.lastMessage.subject || thread.lastMessage.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                        <span className="text-[10px] text-slate-400">{formatTime(thread.lastMessage.createdAt)}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{thread.count}</Badge>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Thread View */}
        <Card className="lg:col-span-2">
          {selected ? (
            <>
              <CardHeader className="border-b border-slate-100 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center text-sm font-bold text-orange-600">
                      {selected.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <CardTitle className="text-base">{selected.name}</CardTitle>
                      <p className="text-xs text-slate-400">{selected.count} messages in this thread</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedThread(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 max-h-[450px] overflow-y-auto">
                <div className="space-y-4">
                  {[...selected.messages].reverse().map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-4 py-3 ${
                          msg.direction === "outbound"
                            ? "bg-orange-500 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            variant={msg.direction === "inbound" ? "default" : "secondary"}
                            className={`text-[10px] ${
                              msg.direction === "outbound"
                                ? "bg-orange-600 text-white border-orange-700"
                                : ""
                            }`}
                          >
                            {msg.direction}
                          </Badge>
                          <span
                            className={`text-[10px] capitalize ${
                              msg.direction === "outbound" ? "text-orange-200" : "text-slate-400"
                            }`}
                          >
                            {msg.type}
                          </span>
                        </div>
                        {msg.subject && (
                          <p className={`text-sm font-medium mb-1 ${msg.direction === "outbound" ? "text-white" : "text-slate-900"}`}>
                            {msg.subject}
                          </p>
                        )}
                        <p className={`text-sm ${msg.direction === "outbound" ? "text-orange-50" : "text-slate-600"}`}>
                          {msg.content || "(No content)"}
                        </p>
                        <p className={`text-[10px] mt-2 ${msg.direction === "outbound" ? "text-orange-200" : "text-slate-400"}`}>
                          {formatDate(msg.createdAt)} {formatTime(msg.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
              <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-slate-300" />
              </div>
              <p className="text-sm text-slate-500 font-medium">Select a conversation</p>
              <p className="text-xs text-slate-400 mt-1">Choose a contact from the left to view the message thread</p>
            </CardContent>
          )}
        </Card>
      </div>
      <ToastContainer />
    </div>
  )
}
