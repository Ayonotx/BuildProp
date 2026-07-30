"use client"

import React, { useState, useRef, useEffect, useCallback } from "react"
import { usePathname, useRouter } from "next/navigation"
import {
  Brain,
  Send,
  X,
  Minimize2,
  Loader2,
  Sparkles,
  ArrowRight,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"

interface Message {
  role: "user" | "assistant"
  content: string
  isAction?: boolean
  suggestions?: Suggestion[]
}

interface Suggestion {
  label: string
  message: string
}

interface ActionResult {
  executed: boolean
  description: string
  suggestions?: Suggestion[]
}

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content:
    "Hi! I'm your BuildProp AI assistant. I can help you with anything:\n\n💬 Ask questions about your business\n📝 Create tasks & reminders\n📅 Schedule meetings\n👤 Add contacts\n📊 Check finances & inventory\n\nTry: \"Create a task to inspect foundation tomorrow\" or \"How many projects do I have?\"",
}

const QUICK_ACTIONS = [
  "What's my outstanding balance?",
  "Create a task for site inspection",
  "Schedule a meeting tomorrow at 10am",
  "What's coming up this week?",
  "How many projects do I have?",
  "Show overdue tasks",
]

const NAV_QUICK_ACTIONS: Suggestion[] = [
  { label: "Projects", message: "Show me my projects" },
  { label: "Properties", message: "Show me my properties" },
  { label: "Invoices", message: "Show me my invoices" },
  { label: "Payments", message: "Show me payments" },
  { label: "Reports", message: "Show me my reports" },
  { label: "Settings", message: "Open settings" },
]

function executeAction(query: string, router: ReturnType<typeof useRouter>): ActionResult {
  const q = query.toLowerCase().trim()

  const steps = q.split(/\s+(?:and|then|&|also)\s+/i).filter(Boolean)

  if (steps.length > 1) {
    steps.forEach((step, i) => {
      setTimeout(() => executeSingleAction(step, router), i * 800)
    })
    return { executed: true, description: `Executing ${steps.length} steps: ${steps.join(' → ')}` }
  }

  return executeSingleAction(q, router)
}

function executeSingleAction(q: string, router: ReturnType<typeof useRouter>): ActionResult {
  const navMap: Record<string, string> = {
    project: "/projects",
    properties: "/properties",
    property: "/properties",
    land: "/land",
    sales: "/sales",
    sale: "/sales",
    crm: "/crm",
    contact: "/crm",
    invoice: "/invoices",
    invoices: "/invoices",
    payment: "/payments",
    payments: "/payments",
    finance: "/finance",
    financial: "/finance",
    inventory: "/inventory",
    equipment: "/equipment",
    fleet: "/fleet",
    vehicle: "/fleet",
    hr: "/hr",
    employee: "/hr",
    payroll: "/hr",
    task: "/tasks",
    tasks: "/tasks",
    calendar: "/calendar",
    document: "/documents",
    documents: "/documents",
    report: "/reports",
    reports: "/reports",
    analytics: "/reports",
    setting: "/settings",
    settings: "/settings",
    branch: "/branches",
    branches: "/branches",
    legal: "/legal",
    notification: "/notifications",
    notifications: "/notifications",
    procurement: "/procurement",
    communication: "/communication",
    website: "/website",
    portal: "/portal",
    assets: "/assets",
    integrations: "/integrations",
  }

  const navPatterns = [
    /^(go to|open|show me|show|navigate to|take me to|display|jump to)\s+(.+)/i,
    /^(can you (go to|open|show|take me to))\s+(.+)/i,
    /^(i want to see|let me see|i need to see|i'd like to see)\s+(.+)/i,
  ]

  for (const pattern of navPatterns) {
    const match = q.match(pattern)
    if (match) {
      const target = (match[2] || match[3] || "").toLowerCase().trim()
      for (const [key, path] of Object.entries(navMap)) {
        if (target.includes(key)) {
          const pageName = key.charAt(0).toUpperCase() + key.slice(1)
          setTimeout(() => router.push(path), 500)
          return {
            executed: true,
            description: `Navigating to ${pageName}...`,
            suggestions: getNavSuggestions(key),
          }
        }
      }
    }
  }

  if (
    q.includes("export") ||
    q.includes("download") ||
    q.includes("csv") ||
    q.includes("pdf")
  ) {
    if (q.includes("project")) {
      setTimeout(() => router.push("/projects"), 500)
      return {
        executed: true,
        description:
          "Opening Projects — use the Export CSV/PDF buttons at the top.",
        suggestions: [
          { label: "View all projects", message: "Show me my projects" },
        ],
      }
    }
    if (q.includes("invoice")) {
      setTimeout(() => router.push("/invoices"), 500)
      return {
        executed: true,
        description:
          "Opening Invoices — use the Export buttons at the top.",
        suggestions: [
          { label: "View all invoices", message: "Show me my invoices" },
        ],
      }
    }
    if (q.includes("sale")) {
      setTimeout(() => router.push("/sales"), 500)
      return {
        executed: true,
        description:
          "Opening Sales — use the Export CSV/PDF buttons at the top.",
        suggestions: [
          { label: "View all sales", message: "Show me my sales" },
        ],
      }
    }
    if (q.includes("report")) {
      setTimeout(() => router.push("/reports"), 500)
      return {
        executed: true,
        description: "Opening Reports page...",
        suggestions: [
          { label: "View reports", message: "Show me my reports" },
        ],
      }
    }
    return {
      executed: true,
      description:
        "I can export data from Projects, Invoices, Sales, and Reports pages. Let me take you there.",
      suggestions: [
        { label: "Projects", message: "Export my projects" },
        { label: "Invoices", message: "Export my invoices" },
        { label: "Sales", message: "Export my sales" },
      ],
    }
  }

  const addPatterns = [
    /^(add|create|new|make)\s+(.+)/i,
    /^(can you (add|create|new))\s+(.+)/i,
    /^(i want to (add|create|new))\s+(.+)/i,
    /^(i need to (add|create|new))\s+(.+)/i,
  ]

  for (const pattern of addPatterns) {
    const match = q.match(pattern)
    if (match) {
      const target = (match[2] || match[3] || "").toLowerCase().trim()
      for (const [key, path] of Object.entries(navMap)) {
        if (target.includes(key)) {
          const pageName = key.charAt(0).toUpperCase() + key.slice(1)
          setTimeout(() => router.push(path), 500)
          return {
            executed: true,
            description: `Opening ${pageName} — click "Add New" to create a new entry.`,
            suggestions: getNavSuggestions(key),
          }
        }
      }
    }
  }

  if (
    q.includes("report") ||
    q.includes("summary") ||
    q.includes("overview") ||
    q.includes("analysis")
  ) {
    if (q.includes("project")) {
      setTimeout(() => router.push("/projects"), 500)
      return {
        executed: true,
        description: "Taking you to Projects for a detailed overview.",
        suggestions: [
          { label: "Create project", message: "Create a new project" },
          { label: "Export projects", message: "Export my projects" },
        ],
      }
    }
    if (q.includes("financial") || q.includes("finance") || q.includes("money")) {
      setTimeout(() => router.push("/finance"), 500)
      return {
        executed: true,
        description: "Opening Financial overview...",
        suggestions: [
          { label: "View payments", message: "Show me payments" },
          { label: "View invoices", message: "Show me my invoices" },
        ],
      }
    }
    if (
      q.includes("property") ||
      q.includes("properties") ||
      q.includes("real estate")
    ) {
      setTimeout(() => router.push("/properties"), 500)
      return {
        executed: true,
        description: "Opening Properties overview...",
        suggestions: [
          { label: "Create property", message: "Create a new property" },
          { label: "View land", message: "Show me my land" },
        ],
      }
    }
    if (q.includes("sale")) {
      setTimeout(() => router.push("/sales"), 500)
      return {
        executed: true,
        description: "Opening Sales overview...",
        suggestions: [
          { label: "Export sales", message: "Export my sales" },
        ],
      }
    }
    if (q.includes("hr") || q.includes("employee")) {
      setTimeout(() => router.push("/hr"), 500)
      return {
        executed: true,
        description: "Opening HR overview...",
        suggestions: [
          { label: "View payroll", message: "Show me payroll" },
        ],
      }
    }
  }

  if (q.includes("print")) {
    if (q.includes("invoice")) {
      setTimeout(() => router.push("/invoices"), 500)
      return {
        executed: true,
        description:
          "Opening Invoices — click the print icon on any invoice to print.",
        suggestions: [
          { label: "View invoices", message: "Show me my invoices" },
        ],
      }
    }
    if (q.includes("sale")) {
      setTimeout(() => router.push("/sales"), 500)
      return {
        executed: true,
        description:
          "Opening Sales — click 'Print Report' to generate a sales report.",
        suggestions: [
          { label: "View sales", message: "Show me my sales" },
        ],
      }
    }
    if (q.includes("receipt") || q.includes("payment")) {
      setTimeout(() => router.push("/payments"), 500)
      return {
        executed: true,
        description:
          "Opening Payments — click the print icon on any receipt.",
        suggestions: [
          { label: "View payments", message: "Show me payments" },
        ],
      }
    }
  }

  return { executed: false, description: "" }
}

function getNavSuggestions(key: string): Suggestion[] {
  const suggestionMap: Record<string, Suggestion[]> = {
    project: [
      { label: "Create project", message: "Create a new project" },
      { label: "Export projects", message: "Export my projects" },
    ],
    property: [
      { label: "Create property", message: "Create a new property" },
      { label: "View land", message: "Show me my land" },
    ],
    land: [
      { label: "Create land", message: "Create a new land entry" },
      { label: "View properties", message: "Show me my properties" },
    ],
    invoice: [
      { label: "Create invoice", message: "Create a new invoice" },
      { label: "Export invoices", message: "Export my invoices" },
    ],
    payment: [
      { label: "Record payment", message: "Create a new payment" },
      { label: "View invoices", message: "Show me my invoices" },
    ],
    sales: [
      { label: "Export sales", message: "Export my sales" },
      { label: "View reports", message: "Show me my reports" },
    ],
    finance: [
      { label: "View invoices", message: "Show me my invoices" },
      { label: "View payments", message: "Show me payments" },
    ],
    hr: [
      { label: "View payroll", message: "Show me payroll" },
      { label: "View employees", message: "Show me my employees" },
    ],
  }

  return (
    suggestionMap[key] || [
      { label: `View ${key}`, message: `Show me my ${key}` },
    ]
  )
}

async function getContextForQuery(query: string): Promise<string> {
  const [dashboard, projects, properties] = await Promise.all([
    fetch("/api/dashboard")
      .then((r) => r.json())
      .catch(() => null),
    fetch("/api/projects")
      .then((r) => r.json())
      .catch(() => []),
    fetch("/api/properties")
      .then((r) => r.json())
      .catch(() => []),
  ])

  let context =
    "You are BuildProp AI, an assistant for a construction and real estate management system.\n\n"

  if (dashboard?.kpi) {
    context += `DASHBOARD KPIs:\n`
    context += `- Total Projects: ${dashboard.kpi.totalProjects || 0}\n`
    context += `- Active Projects: ${dashboard.kpi.activeProjects || 0}\n`
    context += `- Revenue: ${formatCurrency(dashboard.kpi.revenue || 0)}\n`
    context += `- Outstanding: ${formatCurrency(dashboard.kpi.outstanding || 0)}\n`
    context += `- Properties: ${dashboard.kpi.totalProperties || 0}\n`
    context += `- Available Properties: ${dashboard.kpi.availableProperties || 0}\n\n`
  }

  const q = query.toLowerCase()

  if (q.includes("project")) {
    context += `PROJECTS:\n`
    if (Array.isArray(projects)) {
      projects.forEach((p: Record<string, unknown>) => {
        context += `- ${p.name} (${p.code}): ${p.status}, Budget: ${formatCurrency(Number(p.estimatedBudget) || 0)}, Actual: ${formatCurrency(Number(p.actualCost) || 0)}, Progress: ${p.completionPercentage}%, Location: ${p.location || "N/A"}\n`
      })
    }
    context += "\n"
  }

  if (
    q.includes("propert") ||
    q.includes("house") ||
    q.includes("land") ||
    q.includes("real estate") ||
    q.includes("apartment") ||
    q.includes("villa")
  ) {
    context += `PROPERTIES:\n`
    if (Array.isArray(properties)) {
      properties.slice(0, 15).forEach((p: Record<string, unknown>) => {
        context += `- ${p.name}: ${p.propertyType}, ${p.status}, Price: ${formatCurrency(Number(p.price) || 0)}, Area: ${p.areaSqft || "N/A"} sqft, ${p.address || ""} ${p.city || ""}\n`
      })
    }
    context += "\n"
  }

  if (
    q.includes("revenue") ||
    q.includes("money") ||
    q.includes("income") ||
    q.includes("financial") ||
    q.includes("profit") ||
    q.includes("transaction") ||
    q.includes("invoice") ||
    q.includes("payment") ||
    q.includes("budget") ||
    q.includes("cost") ||
    q.includes("expense")
  ) {
    const finance = await fetch("/api/finance")
      .then((r) => r.json())
      .catch(() => [])
    if (Array.isArray(finance)) {
      context += `FINANCIAL TRANSACTIONS:\n`
      finance.slice(0, 15).forEach((t: Record<string, unknown>) => {
        context += `- ${t.description || t.transactionNumber}: ${formatCurrency(Number(t.totalAmount) || 0)} (${t.type}) on ${t.date}\n`
      })
    }
    context += "\n"
  }

  if (q.includes("task") || q.includes("todo") || q.includes("overdue") || q.includes("doing")) {
    const tasks = await fetch("/api/tasks").then(r => r.json()).catch(() => ({ tasks: [] }))
    if (tasks.tasks) {
      context += `TASKS:\n`
      tasks.tasks.slice(0, 10).forEach((t: Record<string, unknown>) => {
        context += `- ${t.title}: ${t.status}, Priority: ${t.priority}, Due: ${t.dueDate || 'No date'}\n`
      })
      context += "\n"
    }
  }

  if (q.includes("calendar") || q.includes("meeting") || q.includes("schedule") || q.includes("event")) {
    const calendar = await fetch("/api/calendar").then(r => r.json()).catch(() => ({ events: [] }))
    const events = calendar.events || calendar
    if (Array.isArray(events)) {
      context += `CALENDAR EVENTS:\n`
      events.slice(0, 10).forEach((e: Record<string, unknown>) => {
        context += `- ${e.title}: ${new Date(e.startTime as string).toLocaleDateString('en-GB')} (${e.status})\n`
      })
      context += "\n"
    }
  }

  if (q.includes("employee") || q.includes("staff") || q.includes("hr") || q.includes("payroll")) {
    const hr = await fetch("/api/hr").then(r => r.json()).catch(() => ({ employees: [] }))
    if (hr.employees) {
      context += `EMPLOYEES:\n`
      hr.employees.slice(0, 10).forEach((e: Record<string, unknown>) => {
        context += `- ${e.firstName} ${e.lastName}: ${e.designation || 'N/A'}, Dept: ${(e.department as Record<string, unknown>)?.name || 'N/A'}, Salary: ${formatCurrency(Number(e.salary) || 0)}\n`
      })
      context += "\n"
    }
  }

  if (q.includes("inventory") || q.includes("stock") || q.includes("material")) {
    const inv = await fetch("/api/inventory").then(r => r.json()).catch(() => ({ items: [] }))
    const items = inv.items || inv
    if (Array.isArray(items)) {
      context += `INVENTORY:\n`
      items.slice(0, 10).forEach((i: Record<string, unknown>) => {
        context += `- ${i.name}: ${i.currentStock} ${i.unitOfMeasure || 'units'}, Min: ${i.minStock || 0}\n`
      })
      context += "\n"
    }
  }

  return context
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="flex items-center gap-1 rounded-xl bg-slate-100 px-4 py-2.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
        <span className="text-xs text-slate-500 ml-1">Thinking...</span>
      </div>
    </div>
  )
}

function AIAssistant() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isThinking])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isThinking) return

      const userMsg: Message = { role: "user", content: text.trim() }
      setMessages((prev) => [...prev, userMsg])
      setInput("")
      setIsThinking(true)

      const actionResult = executeAction(text, router)

      if (actionResult.executed) {
        const actionMsg: Message = {
          role: "assistant",
          content: `${actionResult.description}\n\nLet me pull up some context for you...`,
          isAction: true,
          suggestions: actionResult.suggestions,
        }
        setMessages((prev) => [...prev, actionMsg])

        try {
          const context = await getContextForQuery(text)
          const history = messages
            .slice(-10)
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n")

          const prompt = `${context}\n\nConversation history:\n${history}\n\nuser: ${text}\n\nRespond as a helpful, concise business assistant. Use specific numbers from the data when available. Format responses with bullet points for readability. Be brief but informative.`

          const res = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "chat",
              data: { message: prompt, model: "light" },
            }),
          })

          const data = await res.json()
          if (data.response) {
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: data.response },
            ])
          }
        } catch {
          // AI context fetch failed — action still happened
        }
        setIsThinking(false)
        return
      }

      try {
        const context = await getContextForQuery(text)
        const history = messages
          .slice(-10)
          .map((m) => `${m.role}: ${m.content}`)
          .join("\n")

        const prompt = `${context}\n\nConversation history:\n${history}\n\nuser: ${text}\n\nRespond as a helpful, concise business assistant. Use specific numbers from the data when available. Format responses with bullet points for readability. Be brief but informative.`

        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "chat",
            data: { message: prompt, model: "light" },
          }),
        })

        const data = await res.json()
        const response =
          data.response ||
          data.error ||
          "I couldn't process that request. Please try again."

        const q = text.toLowerCase()
        let followSuggestions: Suggestion[] | undefined
        if (q.includes("project")) {
          followSuggestions = [
            { label: "View all projects", message: "Show me my projects" },
            {
              label: "Create new project",
              message: "Create a new project",
            },
            { label: "Export project report", message: "Export my projects" },
          ]
        } else if (q.includes("propert") || q.includes("land")) {
          followSuggestions = [
            {
              label: "View all properties",
              message: "Show me my properties",
            },
            {
              label: "Create new property",
              message: "Create a new property",
            },
            { label: "View land", message: "Show me my land" },
          ]
        } else if (q.includes("invoice") || q.includes("payment")) {
          followSuggestions = [
            {
              label: "View all invoices",
              message: "Show me my invoices",
            },
            {
              label: "Record payment",
              message: "Show me payments",
            },
            { label: "Export report", message: "Export my invoices" },
          ]
        } else if (
          q.includes("revenue") ||
          q.includes("financial") ||
          q.includes("finance")
        ) {
          followSuggestions = [
            { label: "View finance page", message: "Open finance" },
            { label: "View invoices", message: "Show me my invoices" },
            { label: "View reports", message: "Show me my reports" },
          ]
        } else if (q.includes("report") || q.includes("analytics")) {
          followSuggestions = [
            { label: "Go to reports", message: "Show me my reports" },
            { label: "Export data", message: "Export my reports" },
          ]
        }

        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: response, suggestions: followSuggestions },
        ])
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "Sorry, I'm having trouble connecting. Please check your AI provider settings and try again.",
          },
        ])
      } finally {
        setIsThinking(false)
      }
    },
    [messages, isThinking]
  )

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendMessage(input)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  if (pathname === "/ai") return null

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "h-14 w-14 rounded-full",
            "bg-gradient-to-br from-orange-500 to-amber-500",
            "text-white shadow-lg hover:shadow-xl",
            "transition-all duration-300 hover:scale-105",
            "flex items-center justify-center",
            "group"
          )}
          aria-label="Open AI Assistant"
        >
          <Brain className="h-6 w-6 transition-transform duration-300 group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-green-400 border-2 border-white animate-pulse" />
        </button>
      )}

      {isOpen && (
        <div
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-[380px] h-[560px]",
            "max-md:inset-0 max-md:w-full max-md:h-full max-md:rounded-none",
            "rounded-2xl",
            "bg-white shadow-2xl",
            "border border-slate-200",
            "flex flex-col overflow-hidden",
            "animate-in fade-in slide-in-from-bottom-4 duration-200"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  BuildProp AI Assistant
                </h3>
                <p className="text-[10px] text-white/70">
                  Jarvis Mode — I can navigate & act
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                aria-label="Minimize"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-400">
                    <Brain className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className="max-w-[80%]">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-br-md"
                        : msg.isAction
                          ? "bg-emerald-50 text-slate-800 rounded-bl-md border-l-4 border-green-400"
                          : "bg-slate-100 text-slate-800 rounded-bl-md"
                    )}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>

                  {msg.role === "assistant" &&
                    msg.suggestions &&
                    msg.suggestions.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {msg.suggestions.map((sug, j) => (
                          <button
                            key={j}
                            onClick={() => sendMessage(sug.message)}
                            className={cn(
                              "inline-flex items-center gap-1",
                              "rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1",
                              "text-[11px] font-medium text-orange-700",
                              "hover:bg-orange-100 hover:border-orange-300",
                              "transition-colors duration-150"
                            )}
                          >
                            {sug.label}
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            ))}

            {isThinking && <TypingIndicator />}

            {messages.length === 1 && !isThinking && (
              <>
                <div className="flex flex-wrap gap-2 pt-1">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action}
                      onClick={() => sendMessage(action)}
                      className={cn(
                        "rounded-full border border-orange-200 bg-orange-50 px-3 py-1.5",
                        "text-xs font-medium text-orange-700",
                        "hover:bg-orange-100 hover:border-orange-300",
                        "transition-colors duration-150"
                      )}
                    >
                      {action}
                    </button>
                  ))}
                </div>
                <div className="pt-2">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-2">
                    Quick Navigation
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {NAV_QUICK_ACTIONS.map((action) => (
                      <button
                        key={action.label}
                        onClick={() => sendMessage(action.message)}
                        className={cn(
                          "inline-flex items-center gap-1",
                          "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1",
                          "text-[11px] font-medium text-emerald-700",
                          "hover:bg-emerald-100 hover:border-emerald-300",
                          "transition-colors duration-150"
                        )}
                      >
                        {action.label}
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-slate-200 bg-white p-3">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask or command me..."
                disabled={isThinking}
                className={cn(
                  "flex-1 rounded-xl border border-slate-200 bg-slate-50",
                  "px-4 py-2.5 text-sm text-slate-800",
                  "placeholder:text-slate-400",
                  "focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent",
                  "transition-all duration-150",
                  "disabled:opacity-50"
                )}
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl",
                  "bg-gradient-to-br from-orange-500 to-amber-500",
                  "text-white shadow-sm",
                  "hover:shadow-md hover:scale-105",
                  "transition-all duration-150",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                )}
                aria-label="Send message"
              >
                {isThinking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

export { AIAssistant }
