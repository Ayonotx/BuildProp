"use client"

import React, { use, useCallback, useEffect, useState } from "react"
import { useCrud } from "@/hooks/use-crud"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Plus, Users, UserPlus, Phone, Mail, Search, Pencil, Trash2, Download, Send, X, Loader2, Copy, MessageCircle } from "lucide-react"
import { useToast } from "@/components/dashboard/toast"
import { formatDate } from "@/lib/utils"
import { exportToCSV } from "@/lib/export-csv"
import { exportToPdf } from "@/lib/pdf-export"
import { statusLabel } from "@/lib/utils"

interface Contact {
  id: string
  type: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  company: string | null
  address: string | null
  notes: string | null
  source: string | null
  leadStatus: string | null
  createdAt: string
}

const defaultForm = {
  type: "customer",
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  address: "",
  notes: "",
  source: "website",
  leadStatus: "new",
}

export default function CRMPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStage, setFilterStage] = useState("all")
  const { toast } = useToast()
  const [emailTarget, setEmailTarget] = useState<Contact | null>(null)
  const [emailSubject, setEmailSubject] = useState("")
  const [emailMessage, setEmailMessage] = useState("")
  const [emailSending, setEmailSending] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [callTarget, setCallTarget] = useState<Contact | null>(null)
  const {
    data: contacts, loading, showModal, setShowModal,
    editingItem, setEditingItem, formData, setFormData,
    saving, fetchData, handleSave, handleDelete,
  } = useCrud<Contact>({
    apiPath: "/api/contacts",
    defaultForm,
    onSuccess: (action) => {
      if (action === "save") {
        toast({ title: "Success", description: editingItem ? "Contact updated successfully" : "Contact created successfully", variant: "success" })
      } else {
        toast({ title: "Success", description: "Contact deleted successfully", variant: "success" })
      }
    },
  })

  const contactsWithEmail = contacts.filter((c: Contact) => c.email)
  const contactsWithPhone = contacts.filter((c: Contact) => c.phone)

  function openEmailDialog(contact?: Contact) {
    const recipient = (contact && contact.email ? contact : contactsWithEmail[0]) || null
    if (!recipient) {
      toast({ title: "No contacts with email", description: "Add an email address to a contact first", variant: "error" })
      return
    }
    setEmailTarget(recipient)
    setEmailSubject("")
    setEmailMessage("")
    setEmailError(null)
  }

  function openCallDialog(contact?: Contact) {
    const recipient = (contact && contact.phone ? contact : contactsWithPhone[0]) || null
    if (!recipient) {
      toast({ title: "No contacts with phone", description: "Add a phone number to a contact first", variant: "error" })
      return
    }
    setCallTarget(recipient)
  }

  function digitsOnly(phone: string) {
    return phone.replace(/\D/g, "")
  }

  function whatsAppNumber(phone: string) {
    const digits = digitsOnly(phone)
    if (digits.startsWith("0")) return "233" + digits.slice(1)
    return digits
  }

  async function copyPhone(phone: string) {
    try {
      await navigator.clipboard.writeText(phone)
      toast({ title: "Phone number copied", variant: "success" })
    } catch {
      toast({ title: "Could not copy phone number", variant: "error" })
    }
  }

  async function sendQuickEmail() {
    if (!emailTarget) return
    if (!emailSubject.trim() || !emailMessage.trim()) {
      setEmailError("Subject and message are required.")
      return
    }
    setEmailSending(true)
    setEmailError(null)
    try {
      const res = await fetch("/api/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailTarget.email,
          subject: emailSubject,
          html: `<div style="font-family: Arial, Helvetica, sans-serif; color: #1e293b;"><p>Dear ${emailTarget.firstName} ${emailTarget.lastName},</p><p style="white-space: pre-wrap;">${emailMessage}</p></div>`,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEmailTarget(null)
        toast({ title: "Email sent", description: `Message sent to ${emailTarget.email}`, variant: "success" })
      } else {
        setEmailError(Array.isArray(data?.details) && data.details.length > 0 ? data.details[0] : data?.error || "Could not send email")
      }
    } catch {
      setEmailError("Could not send email")
    }
    setEmailSending(false)
  }

  const openCreate = useCallback(() => {
    setEditingItem(null)
    setFormData(defaultForm)
    setShowModal(true)
  }, [setEditingItem, setFormData, setShowModal])

  const params = use(searchParams)

  useEffect(() => {
    if (params.new === "1") openCreate()
  }, [params, openCreate])

  function openEdit(item: Contact) {
    setEditingItem(item)
    setFormData({
      type: item.type, firstName: item.firstName, lastName: item.lastName,
      email: item.email || "", phone: item.phone || "", company: item.company || "",
      address: item.address || "", notes: item.notes || "", source: item.source || "website",
      leadStatus: item.leadStatus || "new",
    })
    setShowModal(true)
  }

  const totalContacts = contacts.length
  const customers = contacts.filter((c: Contact) => c.type === "customer").length
  const leads = contacts.filter((c: Contact) => c.type === "lead").length
  const vendors = contacts.filter((c: Contact) => c.type === "vendor").length

  const typeVariant = (t: string) => {
    if (t === "customer") return "default"
    if (t === "lead") return "success"
    if (t === "tenant") return "secondary"
    return "outline"
  }

  const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
  const getInitials = (first: string, last: string) => `${first[0] || ""}${last[0] || ""}`.toUpperCase()

  const filteredContacts = contacts.filter((c: Contact) => {
    if (!searchQuery && filterStage === "all") return true
    const q = searchQuery.toLowerCase()
    const matchesSearch = !searchQuery || `${c.firstName} ${c.lastName} ${c.email || ""} ${c.phone || ""} ${c.company || ""}`.toLowerCase().includes(q)
    const matchesStage = filterStage === "all" || c.leadStatus === filterStage
    return matchesSearch && matchesStage
  })

  const recentContacts = [...contacts].slice(0, 5)

  const stats = [
    { label: "Total Contacts", value: totalContacts, icon: Users, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Customers", value: customers, icon: Users, color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Leads", value: leads, icon: UserPlus, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Vendors", value: vendors, icon: Users, color: "text-red-500", bg: "bg-red-50" },
  ]

  const funnelStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won']
  const funnelColors = ['bg-blue-100 text-blue-700', 'bg-indigo-100 text-indigo-700', 'bg-purple-100 text-purple-700', 'bg-amber-100 text-amber-700', 'bg-orange-100 text-orange-700', 'bg-green-100 text-green-700']

  function handleExportPdf() {
    exportToPdf({
      title: "Contacts",
      subtitle: `${filteredContacts.length} contact${filteredContacts.length !== 1 ? "s" : ""}`,
      headers: ["Name", "Type", "Email", "Phone", "Company", "Source"],
      rows: filteredContacts.map((c: Contact) => [
        `${c.firstName} ${c.lastName}`, typeLabel(c.type), c.email || "—",
        c.phone || "—", c.company || "—", c.source ? typeLabel(c.source) : "—",
      ]),
      filename: "contacts.pdf",
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Relationship Management"
        description="Manage leads, customers, and communications"
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => exportToCSV(filteredContacts.map((c: Contact) => ({
              Type: c.type, "First Name": c.firstName, "Last Name": c.lastName,
              Email: c.email || "", Phone: c.phone || "", Company: c.company || "",
              Address: c.address || "", Source: c.source || "",
            })), "contacts.csv")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Button variant="outline" onClick={handleExportPdf}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Contact</Button>
          </div>
        }
      />

      <StatsGrid stats={stats} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Lead Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
            {funnelStages.map((stage, i) => {
              const count = contacts.filter((c: any) => c.leadStatus === stage).length
              return (
                <div key={stage} className={`flex-shrink-0 px-4 py-2 rounded-lg ${funnelColors[i]}`}>
                  <div className="text-lg font-bold">{count}</div>
                  <div className="text-xs capitalize">{stage}</div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setFilterStage("all")}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterStage === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
            >
              All
            </button>
            {funnelStages.map((stage) => (
              <button
                key={stage}
                onClick={() => setFilterStage(stage)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${filterStage === stage ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {stage}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Contacts</CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input type="search" placeholder="Search contacts..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingState message="Loading contacts..." />
              ) : filteredContacts.length === 0 ? (
                <EmptyState message="No contacts yet. Add your first contact!" />
              ) : (
                <div className="space-y-3">
                  {filteredContacts.map((contact: Contact) => (
                    <div key={contact.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                      <Avatar fallback={getInitials(contact.firstName, contact.lastName)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900">{contact.firstName} {contact.lastName}</p>
                          <Badge variant={typeVariant(contact.type) as any}>{typeLabel(contact.type)}</Badge>
                          {contact.leadStatus && contact.leadStatus !== "new" && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${
                              contact.leadStatus === "won" ? "bg-green-100 text-green-700" :
                              contact.leadStatus === "lost" ? "bg-red-100 text-red-700" :
                              contact.leadStatus === "negotiation" ? "bg-orange-100 text-orange-700" :
                              contact.leadStatus === "proposal" ? "bg-amber-100 text-amber-700" :
                              contact.leadStatus === "qualified" ? "bg-purple-100 text-purple-700" :
                              contact.leadStatus === "contacted" ? "bg-indigo-100 text-indigo-700" :
                              "bg-blue-100 text-blue-700"
                            }`}>
                              {contact.leadStatus}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                          {contact.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{contact.email}</span>}
                          {contact.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.email && (
                          <Button variant="ghost" size="sm" onClick={() => openEmailDialog(contact)} title="Send email">
                            <Mail className="h-4 w-4 text-blue-500" />
                          </Button>
                        )}
                        {contact.phone && (
                          <Button variant="ghost" size="sm" onClick={() => openCallDialog(contact)} title="Call">
                            <Phone className="h-4 w-4 text-orange-500" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(contact)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(contact.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Recent Contacts</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentContacts.length === 0 ? (
                  <p className="text-sm text-slate-400">No recent activity</p>
                ) : recentContacts.map((contact: Contact) => (
                  <div key={contact.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{contact.firstName} {contact.lastName}</p>
                      <p className="text-xs text-slate-500">{typeLabel(contact.type)}{contact.company ? ` at ${contact.company}` : ""}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(contact.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "New Lead", icon: UserPlus, color: "bg-blue-50 text-blue-600", onClick: () => { setFormData({ ...defaultForm, type: "lead" }); openCreate() } },
                  { label: "Add Contact", icon: Users, color: "bg-emerald-50 text-emerald-600", onClick: () => openCreate() },
                  { label: "Call", icon: Phone, color: "bg-orange-50 text-orange-600", onClick: () => openCallDialog() },
                  { label: "Email", icon: Mail, color: "bg-purple-50 text-purple-600", onClick: () => openEmailDialog() },
                ].map((action) => {
                  const Icon = action.icon
                  return (
                    <button
                      key={action.label}
                      onClick={action.onClick}
                      className={`flex flex-col items-center gap-2 rounded-xl p-4 ${action.color} hover:opacity-80 transition-opacity`}
                    >
                      <Icon className="h-6 w-6" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {emailTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Send Email to {emailTarget.firstName} {emailTarget.lastName}</h3>
              <button onClick={() => setEmailTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recipient *</label>
              <select
                value={emailTarget.id}
                onChange={(e) => {
                  const selected = contacts.find((c: Contact) => c.id === e.target.value)
                  if (selected) setEmailTarget(selected)
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              >
                {contactsWithEmail.map((c: Contact) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.email}</option>
                ))}
              </select>
            </div>
            <p className="text-sm text-slate-500 break-all">{emailTarget.email}</p>
            {emailError && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">{emailError}</div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Subject *</label>
              <input type="text" value={emailSubject} onChange={e => setEmailSubject(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Message *</label>
              <textarea value={emailMessage} onChange={e => setEmailMessage(e.target.value)} rows={5} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEmailTarget(null)}>Cancel</Button>
              <Button onClick={sendQuickEmail} disabled={emailSending}>
                {emailSending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                {emailSending ? "Sending..." : "Send Email"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {callTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-lg w-full mx-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Call {callTarget.firstName} {callTarget.lastName}</h3>
              <button onClick={() => setCallTarget(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Recipient *</label>
              <select
                value={callTarget.id}
                onChange={(e) => {
                  const selected = contacts.find((c: Contact) => c.id === e.target.value)
                  if (selected) setCallTarget(selected)
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              >
                {contactsWithPhone.map((c: Contact) => (
                  <option key={c.id} value={c.id}>{c.firstName} {c.lastName} — {c.phone}</option>
                ))}
              </select>
            </div>
            <div className="rounded-lg bg-orange-50 border border-orange-200 p-4 text-center">
              <p className="text-xl font-bold text-slate-900">{callTarget.phone}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Button onClick={() => window.open("tel:" + callTarget.phone, "_blank")}>
                <Phone className="h-4 w-4 mr-1" />Open Dialer
              </Button>
              <Button variant="outline" onClick={() => window.open("https://wa.me/" + whatsAppNumber(callTarget.phone || ""), "_blank")}>
                <MessageCircle className="h-4 w-4 mr-1" />WhatsApp
              </Button>
              <Button variant="outline" onClick={() => copyPhone(callTarget.phone || "")}>
                <Copy className="h-4 w-4 mr-1" />Copy Number
              </Button>
            </div>
            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setCallTarget(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}

      <CRUDModal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? "Edit Contact" : "New Contact"}
        onSave={handleSave}
        saving={saving}
        disabled={!formData.firstName || !formData.lastName}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="customer">Customer</option>
              <option value="lead">Lead</option>
              <option value="tenant">Tenant</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
            <select value={formData.source} onChange={e => setFormData({...formData, source: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="cold_call">Cold Call</option>
              <option value="social_media">Social Media</option>
              <option value="advertisement">Advertisement</option>
              <option value="walk_in">Walk In</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Lead Status</label>
            <select value={formData.leadStatus} onChange={e => setFormData({...formData, leadStatus: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="qualified">Qualified</option>
              <option value="proposal">Proposal</option>
              <option value="negotiation">Negotiation</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">First Name *</label>
            <input type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Last Name *</label>
            <input type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
            <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Company</label>
            <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
        </div>
      </CRUDModal>
    </div>
  )
}
