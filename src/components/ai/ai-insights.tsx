"use client"

import React, { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Brain, Sparkles, TrendingUp, AlertTriangle, Lightbulb, ChevronRight, Loader2 } from "lucide-react"

interface Insight {
  id: number
  title: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}

const fallbackInsights: Insight[] = [
  {
    id: 1,
    title: "Sunrise Villa may complete 12 days early",
    icon: TrendingUp,
    color: "text-emerald-500",
  },
  {
    id: 2,
    title: "Ocean View budget risk detected (23%)",
    icon: AlertTriangle,
    color: "text-red-500",
  },
  {
    id: 3,
    title: "3 leads need follow-up to close deals",
    icon: Lightbulb,
    color: "text-amber-500",
  },
]

export function AIInsights() {
  const [insights, setInsights] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    async function fetchInsights() {
      try {
        const statusRes = await fetch("/api/ai")
        const statusData = await statusRes.json()
        if (!statusData.available) {
          setLoading(false)
          return
        }

        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "insights", data: {} }),
        })
        const data = await res.json()
        if (data.insights) {
          setInsights(data.insights)
          setAvailable(true)
        }
      } catch {
        // use fallback
      } finally {
        setLoading(false)
      }
    }
    fetchInsights()
  }, [])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-500" />
          <h3 className="text-sm font-semibold text-slate-900">AI Insights</h3>
        </div>
        <a href="/ai" className="text-xs text-purple-500 hover:text-purple-600 font-medium flex items-center gap-1">
          View All <ChevronRight className="h-3 w-3" />
        </a>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-4 text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          <span className="text-xs">Loading insights...</span>
        </div>
      ) : available && insights ? (
        <div className="p-3 rounded-lg bg-purple-50/50 border border-purple-100">
          <div className="flex items-start gap-2">
            <Sparkles className="h-4 w-4 mt-0.5 shrink-0 text-purple-500" />
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{insights}</p>
          </div>
        </div>
      ) : (
        fallbackInsights.map((insight) => {
          const Icon = insight.icon
          return (
            <div key={insight.id} className="flex items-start gap-3 p-3 rounded-lg bg-purple-50/50 border border-purple-100">
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${insight.color}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-slate-700">{insight.title}</p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
