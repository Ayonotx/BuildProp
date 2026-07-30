"use client"

import React, { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Brain,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Target,
  BarChart3,
  MessageSquare,
  FileText,
  Users,
  Building2,
  DollarSign,
  Settings,
  Play,
  Pause,
  Plus,
  Eye,
  ChevronRight,
  Lightbulb,
  Shield,
  Bot,
  Image,
  Search,
  ArrowRight,
  Loader2,
  Wifi,
  WifiOff,
  Send,
  Key,
  Check,
  X,
  Server,
  Lock,
} from "lucide-react"
import { AI_ENABLED } from "@/lib/features"

interface ChatMessage {
  role: "user" | "assistant"
  message: string
  model?: string
  provider?: string
}

interface ProviderConfig {
  enabled: boolean
  url?: string
  apiKey?: string
  model?: string
}

interface ProvidersPayload {
  activeProvider: string
  ollama: ProviderConfig & { url: string }
  openai: ProviderConfig
  gemini: ProviderConfig
  anthropic: ProviderConfig
  groq: ProviderConfig
}

const DEFAULT_PROVIDERS: ProvidersPayload = {
  activeProvider: "groq",
  ollama: { enabled: true, url: "http://localhost:11434" },
  openai: { enabled: false, apiKey: "", model: "gpt-4o-mini" },
  gemini: { enabled: false, apiKey: "", model: "gemini-flash" },
  anthropic: { enabled: false, apiKey: "", model: "claude-3.5-sonnet" },
  groq: { enabled: true, apiKey: "", model: "llama-3.1-8b-instant" },
}

const MODEL_OPTIONS = [
  { id: "light", label: "Fast (3B)", icon: "⚡", tier: "light" },
  { id: "heavy", label: "Detailed (8B)", icon: "🧠", tier: "heavy" },
]

const PROVIDER_LABELS: Record<string, string> = {
  ollama: "Ollama (Local)",
  openai: "OpenAI",
  gemini: "Google Gemini",
  anthropic: "Anthropic Claude",
  groq: "Groq (Cloud)",
}

const SUGGESTED_PROMPTS = [
  "Analyze my projects",
  "Financial summary",
  "Risk assessment",
  "Recommendations",
]

const DEFAULT_AUTOMATIONS = [
  {
    id: 1,
    name: "Payment Reminder",
    description: "Automatically send SMS/email reminders 3 days before payment due date",
    trigger: "Payment due in 3 days",
    action: "Send notification",
  },
  {
    id: 2,
    name: "Low Stock Alert",
    description: "Notify warehouse manager when inventory falls below minimum threshold",
    trigger: "Stock < minimum",
    action: "Send alert + create PO draft",
  },
  {
    id: 3,
    name: "Lead Follow-up",
    description: "Auto-assign follow-up task when lead is inactive for 5+ days",
    trigger: "Lead inactive 5 days",
    action: "Create task + notify sales rep",
  },
  {
    id: 4,
    name: "Project Milestone Alert",
    description: "Send team notification 7 days before milestone deadline",
    trigger: "7 days to milestone",
    action: "Send team notification",
  },
  {
    id: 5,
    name: "Equipment Maintenance",
    description: "Schedule maintenance when equipment hours reach threshold",
    trigger: "Hours > threshold",
    action: "Create maintenance task",
  },
  {
    id: 6,
    name: "Invoice Auto-Send",
    description: "Automatically email invoices when marked as ready",
    trigger: "Invoice status = Ready",
    action: "Email to client",
  },
]

function loadAutomationToggles(): Record<number, boolean> {
  if (typeof window === "undefined") return {}
  try {
    const stored = localStorage.getItem("buildprop_automation_toggles")
    if (stored) return JSON.parse(stored)
  } catch {}
  return {}
}

function saveAutomationToggles(toggles: Record<number, boolean>) {
  try {
    localStorage.setItem("buildprop_automation_toggles", JSON.stringify(toggles))
  } catch {}
}

export default function AIPage() {
  if (!AI_ENABLED) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
          <Lock className="h-8 w-8 text-slate-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">AI Features Not Available</h2>
        <p className="text-sm text-slate-500 text-center max-w-md">
          AI-powered insights, predictions, chatbot, and workflow automation are available in BuildProp Premium.
        </p>
        <a
          href="https://buildprop.com/pricing"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
        >
          Upgrade to Premium
          <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    )
  }

  const [activeTab, setActiveTab] = useState<"insights" | "automations" | "predictions" | "chatbot">("insights")
  const [ollamaAvailable, setOllamaAvailable] = useState<boolean | null>(null)
  const [ollamaModel, setOllamaModel] = useState("")
  const [availableModels, setAvailableModels] = useState<string[]>([])

  const [automationToggles, setAutomationToggles] = useState<Record<number, boolean>>(() => loadAutomationToggles())

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [insights, setInsights] = useState<string>("")
  const [insightsLoading, setInsightsLoading] = useState(false)

  const [prediction, setPrediction] = useState<string>("")
  const [predictionLoading, setPredictionLoading] = useState(false)

  const [modelTier, setModelTier] = useState<string>("heavy")
  const [providers, setProviders] = useState<ProvidersPayload>(DEFAULT_PROVIDERS)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsMessage, setSettingsMessage] = useState<string>("")

  const loadProviders = useCallback(() => {
    try {
      const stored = localStorage.getItem("buildprop_ai_providers")
      if (stored) {
        const parsed = JSON.parse(stored) as ProvidersPayload
        setProviders({ ...DEFAULT_PROVIDERS, ...parsed })
      }
    } catch {}
  }, [])

  const loadModelTier = useCallback(() => {
    try {
      const stored = localStorage.getItem("buildprop_ai_model")
      if (stored && (stored === "light" || stored === "heavy")) {
        setModelTier(stored)
      }
    } catch {}
  }, [])

  useEffect(() => {
    loadProviders()
    loadModelTier()
  }, [loadProviders, loadModelTier])

  useEffect(() => {
    fetchOllamaStatus()
  }, [])

  useEffect(() => {
    if (activeTab === "insights" && !insights && ollamaAvailable !== false) {
      fetchInsights()
    }
    if (activeTab === "predictions" && !prediction && ollamaAvailable !== false) {
      fetchPrediction()
    }
  }, [activeTab, ollamaAvailable])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [chatMessages])

  const handleModelChange = (tier: string) => {
    setModelTier(tier)
    localStorage.setItem("buildprop_ai_model", tier)
  }

  async function fetchOllamaStatus() {
    try {
      const url = providers?.ollama?.url || "http://localhost:11434"
      const res = await fetch(`/api/ai?ollamaUrl=${encodeURIComponent(url)}`)
      const data = await res.json()
      setOllamaAvailable(data.available)
      setOllamaModel(data.model)
      setAvailableModels(data.models || [])
    } catch {
      setOllamaAvailable(false)
    }
  }

  async function fetchInsights() {
    setInsightsLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "insights", data: { model: modelTier } }),
      })
      const data = await res.json()
      setInsights(data.insights || "No insights available.")
    } catch {
      setInsights("Failed to fetch insights.")
    } finally {
      setInsightsLoading(false)
    }
  }

  async function fetchPrediction() {
    setPredictionLoading(true)
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "predict", data: { entityType: "project completion", model: modelTier } }),
      })
      const data = await res.json()
      setPrediction(data.prediction || "No prediction available.")
    } catch {
      setPrediction("Failed to fetch prediction.")
    } finally {
      setPredictionLoading(false)
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = chatInput.trim()
    setChatInput("")
    setChatMessages((prev) => [...prev, { role: "user", message: userMessage }])
    setChatLoading(true)

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "chat", data: { message: userMessage, model: modelTier } }),
      })
      const data = await res.json()
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", message: data.response || "No response.", model: data.model, provider: data.provider },
      ])
    } catch {
      setChatMessages((prev) => [...prev, { role: "assistant", message: "Failed to get response. Please try again." }])
    } finally {
      setChatLoading(false)
    }
  }

  async function handleSaveSettings() {
    setSettingsSaving(true)
    setSettingsMessage("")
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-settings", data: providers }),
      })
      const data = await res.json()
      if (data.success) {
        setSettingsMessage("Settings saved securely on server.")
        localStorage.setItem("buildprop_ai_providers", JSON.stringify(providers))
      } else {
        setSettingsMessage(data.error || "Failed to save settings.")
      }
    } catch {
      setSettingsMessage("Failed to save settings.")
    } finally {
      setSettingsSaving(false)
    }
  }

  async function handleTestConnection(provider: string) {
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test-connection", data: { provider } }),
      })
      return await res.json()
    } catch {
      return { success: false, message: "Connection failed" }
    }
  }

  const isNonOllamaProvider = providers.activeProvider !== "ollama"
  const showProviderOnline = isNonOllamaProvider || ollamaAvailable
  const isOnline = isNonOllamaProvider ? !!(providers[providers.activeProvider as keyof ProvidersPayload] as ProviderConfig)?.enabled : ollamaAvailable
  const currentModelLabel = modelTier === "light" ? "Fast (3B)" : "Detailed (8B)"
  const activeProviderLabel = PROVIDER_LABELS[providers.activeProvider] || providers.activeProvider

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Brain className="h-7 w-7 text-purple-500" />
            AI & Automation
          </h1>
          <p className="text-sm text-slate-500">Intelligent insights, predictions, and workflow automation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm">
            <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className={isOnline ? "text-emerald-700" : "text-red-700"}>
              {isOnline ? activeProviderLabel : `${activeProviderLabel} offline`}
            </span>
            {providers.activeProvider === "ollama" && ollamaModel && (
              <>
                <span className="text-slate-400">|</span>
                <span className="text-slate-500">{ollamaModel}</span>
              </>
            )}
          </div>
          <Button><Plus className="h-4 w-4 mr-2" />New Automation</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Configured Automations", value: String(DEFAULT_AUTOMATIONS.length), icon: Zap, color: "text-orange-500", bg: "bg-orange-50" },
          { label: "Currently Enabled", value: String(Object.values(automationToggles).filter(Boolean).length), icon: CheckCircle, color: "text-emerald-500", bg: "bg-emerald-50" },
          { label: "Provider Status", value: isOnline ? "Online" : "Offline", icon: isOnline ? Wifi : WifiOff, color: isOnline ? "text-emerald-500" : "text-red-500", bg: isOnline ? "bg-emerald-50" : "bg-red-50" },
          { label: "Model Tier", value: modelTier === "light" ? "Fast" : "Detailed", icon: Brain, color: "text-purple-500", bg: "bg-purple-50" },
        ].map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-center gap-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                    <p className="text-sm text-slate-500">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {!isOnline && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <h3 className="font-medium text-amber-900">{activeProviderLabel} Not Available</h3>
                {providers.activeProvider === "ollama" ? (
                  <div className="text-sm text-amber-700 mt-1 space-y-1">
                    <p className="font-medium">AI features use Ollama for local inference.</p>
                    <p>Getting started:</p>
                    <ol className="list-decimal list-inside space-y-0.5 ml-1">
                      <li>Download Ollama from <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" className="underline font-medium">ollama.com/download</a></li>
                      <li>Install and run: <code className="bg-amber-100 px-1.5 py-0.5 rounded text-xs">ollama pull llama3.2:3b</code></li>
                      <li>Click &quot;Refresh Connection&quot; below</li>
                    </ol>
                    <p className="text-xs text-amber-600 mt-1">No data is sent to external servers — everything runs locally on your machine.</p>
                  </div>
                ) : (
                  <p className="text-sm text-amber-700 mt-1">
                    Configure your API key in AI Settings to use {activeProviderLabel}. API keys are stored securely on the server.
                  </p>
                )}
                {providers.activeProvider === "ollama" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-300 text-amber-700 hover:bg-amber-100"
                    onClick={() => fetchOllamaStatus()}
                  >
                    <Wifi className="h-4 w-4 mr-2" />
                    Refresh Connection
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-4 border-b border-slate-200 pb-0">
        {(["insights", "automations", "predictions", "chatbot"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 px-4 text-sm font-medium capitalize transition-colors border-b-2 ${
              activeTab === tab
                ? "border-purple-500 text-purple-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "chatbot" ? "AI Assistant" : tab}
          </button>
        ))}
      </div>

      {/* Insights Tab */}
      {activeTab === "insights" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI-Generated Insights
            </CardTitle>
            <Button variant="outline" size="sm" onClick={() => { setInsights(""); fetchInsights() }} disabled={insightsLoading}>
              {insightsLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {insightsLoading && !insights ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-3" />
                <p className="text-sm">Analyzing your business data...</p>
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                {insights || "No insights available."}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Automations Tab */}
      {activeTab === "automations" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Workflow Automations</CardTitle>
            <Button><Plus className="h-4 w-4 mr-2" />Create Automation</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DEFAULT_AUTOMATIONS.map((auto) => {
                const enabled = automationToggles[auto.id] ?? true
                return (
                <div key={auto.id} className="p-4 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${enabled ? "bg-emerald-50" : "bg-slate-100"}`}>
                        <Zap className={`h-5 w-5 ${enabled ? "text-emerald-500" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">{auto.name}</h3>
                        <p className="text-sm text-slate-500">{auto.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={enabled ? "success" : "secondary"}>
                        {enabled ? "Enabled" : "Disabled"}
                      </Badge>
                      <button
                        onClick={() => {
                          const next = { ...automationToggles, [auto.id]: !enabled }
                          setAutomationToggles(next)
                          saveAutomationToggles(next)
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded"
                      >
                        {enabled ? <Pause className="h-4 w-4 text-slate-500" /> : <Play className="h-4 w-4 text-emerald-500" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Trigger</p>
                      <p className="text-slate-700 font-medium">{auto.trigger}</p>
                    </div>
                    <div>
                      <p className="text-slate-500">Action</p>
                      <p className="text-slate-700 font-medium">{auto.action}</p>
                    </div>
                  </div>
                </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Predictions Tab */}
      {activeTab === "predictions" && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-500" />
                AI Prediction Analysis
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => { setPrediction(""); fetchPrediction() }} disabled={predictionLoading}>
                {predictionLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {predictionLoading && !prediction ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500 mb-3" />
                  <p className="text-sm">Generating prediction analysis...</p>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                  {prediction || "No prediction available."}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { risk: "Budget overrun on Ocean View", probability: 23, severity: "High", mitigation: "Review spending, renegotiate supplier contracts" },
                  { risk: "Material delay for Downtown Plaza", probability: 45, severity: "Medium", mitigation: "Order materials 2 weeks ahead, identify alternative suppliers" },
                  { risk: "Staff shortage in Kumasi branch", probability: 15, severity: "Low", mitigation: "Cross-train existing staff, prepare recruitment pipeline" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100">
                    <AlertTriangle className={`h-5 w-5 shrink-0 ${r.severity === "High" ? "text-red-500" : r.severity === "Medium" ? "text-amber-500" : "text-emerald-500"}`} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900">{r.risk}</p>
                        <Badge variant={r.severity === "High" ? "destructive" : r.severity === "Medium" ? "warning" : "success"}>{r.severity}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">Mitigation: {r.mitigation}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-900">{r.probability}%</p>
                      <p className="text-xs text-slate-500">probability</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chatbot Tab */}
      {activeTab === "chatbot" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="h-[640px] flex flex-col">
              <CardHeader className="border-b border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-500" />
                    BuildProp AI Assistant
                    {ollamaAvailable === null && providers.activeProvider === "ollama" ? (
                      <Badge variant="secondary"><Loader2 className="h-3 w-3 animate-spin mr-1" />Checking</Badge>
                    ) : isOnline ? (
                      <Badge variant="success">Online</Badge>
                    ) : (
                      <Badge variant="destructive">Offline</Badge>
                    )}
                  </CardTitle>
                </div>
                {/* Model Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Model:</span>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                    {MODEL_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => handleModelChange(opt.tier)}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                          modelTier === opt.tier
                            ? "bg-purple-600 text-white"
                            : "bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {opt.icon} {opt.label}
                      </button>
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600">
                    <span className={`h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-500"}`} />
                    {activeProviderLabel}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-6 space-y-4">
                {chatMessages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400">
                    <Bot className="h-12 w-12 mb-3 text-purple-300" />
                    <p className="text-sm">Ask me anything about your projects, finances, or properties.</p>
                    {!isOnline && (
                      <p className="text-xs text-amber-600 mt-2">
                        {providers.activeProvider === "ollama"
                          ? "Ollama is not running. Start it to use the AI assistant."
                          : `${activeProviderLabel} is not configured. Check AI Settings.`}
                      </p>
                    )}
                  </div>
                )}
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}>
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-1 mb-1">
                          <Sparkles className="h-3 w-3 text-purple-500" />
                          <span className="text-xs font-medium text-purple-500">AI Assistant</span>
                          {msg.provider && (
                            <span className="text-[10px] text-slate-400 ml-1">
                              ({PROVIDER_LABELS[msg.provider] || msg.provider}{msg.model ? ` / ${msg.model}` : ""})
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-sm whitespace-pre-line">{msg.message}</p>
                    </div>
                  </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-1 mb-1">
                        <Sparkles className="h-3 w-3 text-purple-500" />
                        <span className="text-xs font-medium text-purple-500">AI Assistant</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </CardContent>
              <div className="border-t border-slate-200 p-4 space-y-3">
                <form onSubmit={handleSendMessage} className="flex gap-3">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={!isOnline ? "Configure an AI provider to start chatting..." : "Ask about projects, finances, properties..."}
                    disabled={chatLoading || !isOnline}
                    maxLength={10000}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 disabled:opacity-50"
                  />
                  <Button type="submit" className="bg-purple-600 hover:bg-purple-700" disabled={chatLoading || !chatInput.trim() || !isOnline}>
                    {chatLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                {/* Suggested Prompts */}
                {chatMessages.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_PROMPTS.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setChatInput(prompt)
                        }}
                        disabled={!isOnline}
                        className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            {/* AI Settings Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-emerald-500" />
                  AI Provider Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200">
                  <Server className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs text-emerald-700 font-medium">API keys are stored securely on the server</span>
                </div>

                {/* Active Provider */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Active Provider</label>
                  <select
                    value={providers.activeProvider}
                    onChange={(e) => setProviders({ ...providers, activeProvider: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  >
                    <option value="groq">Groq (Cloud) — Ultra-fast Llama inference</option>
                    <option value="ollama">Ollama (Local)</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                    <option value="anthropic">Anthropic Claude</option>
                  </select>
                </div>

                {/* Ollama URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">Ollama URL (localhost only)</label>
                  <input
                    type="text"
                    value={providers.ollama.url}
                    onChange={(e) => setProviders({ ...providers, ollama: { ...providers.ollama, url: e.target.value } })}
                    placeholder="http://localhost:11434"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-purple-400"
                  />
                </div>

                {/* API Keys */}
                {[
                  { key: "groq" as const, label: "Groq API Key", placeholder: "gsk_..." },
                  { key: "openai" as const, label: "OpenAI API Key", placeholder: "sk-..." },
                  { key: "gemini" as const, label: "Gemini API Key", placeholder: "AIza..." },
                  { key: "anthropic" as const, label: "Anthropic API Key", placeholder: "sk-ant-..." },
                ].map(({ key, label, placeholder }) => (
                  <div className="space-y-1.5" key={key}>
                    <label className="text-xs font-medium text-slate-600">{label}</label>
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="password"
                        value={(providers[key] as ProviderConfig).apiKey || ""}
                        onChange={(e) => setProviders({ ...providers, [key]: { ...providers[key], apiKey: e.target.value } })}
                        placeholder={placeholder}
                        className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm outline-none focus:border-purple-400"
                      />
                    </div>
                  </div>
                ))}

                {settingsMessage && (
                  <div className={`text-xs p-2 rounded-lg ${settingsMessage.includes("saved") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>
                    {settingsMessage}
                  </div>
                )}

                <Button
                  onClick={handleSaveSettings}
                  disabled={settingsSaving}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                  Save Settings Securely
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[
                    "Show project status summary",
                    "What's our revenue forecast?",
                    "Which properties are hot leads?",
                    "Any overdue invoices?",
                    "Equipment maintenance schedule",
                    "Employee attendance today",
                  ].map((query, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setChatInput(query)
                        setActiveTab("chatbot")
                      }}
                      className="w-full text-left rounded-lg border border-slate-100 p-3 text-sm text-slate-700 hover:bg-purple-50 hover:border-purple-200 transition-colors"
                    >
                      {query}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { icon: Brain, label: "Natural Language Queries", desc: "Ask questions in plain English" },
                    { icon: TrendingUp, label: "Predictive Analytics", desc: "Forecast revenue & completion" },
                    { icon: Shield, label: "Risk Detection", desc: "Identify project risks early" },
                    { icon: Zap, label: "Workflow Automation", desc: "Automate repetitive tasks" },
                    { icon: FileText, label: "Auto Report Generation", desc: "Generate reports instantly" },
                    { icon: Target, label: "Smart Recommendations", desc: "AI-powered suggestions" },
                  ].map((cap, i) => {
                    const Icon = cap.icon
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50">
                          <Icon className="h-4 w-4 text-purple-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">{cap.label}</p>
                          <p className="text-xs text-slate-500">{cap.desc}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
