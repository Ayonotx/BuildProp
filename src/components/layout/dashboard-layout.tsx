"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { BottomNav } from "./bottom-nav"
import { cn } from "@/lib/utils"
import { AI_ENABLED, DEMO_MODE } from "@/lib/features"
import TutorialOverlay from "@/components/tutorial/tutorial-overlay"
import { AIAssistant } from "@/components/ai/ai-assistant"

const TUTORIAL_KEY = "buildprop_tutorial_done"

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_KEY)
    if (done) return

    let cancelled = false
    let attempts = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    // Show only after the page has actually finished loading (dashboard content rendered),
    // so the spotlight/tooltip can anchor to real elements. Fall back to showing anyway
    // after ~5s so slow machines or non-dashboard pages never get stuck.
    const tryShow = () => {
      if (cancelled) return
      const contentReady = !!document.querySelector("main h1")
      if (contentReady || attempts >= 25) {
        setShowTutorial(true)
        return
      }
      attempts += 1
      timer = setTimeout(tryShow, 200)
    }

    timer = setTimeout(tryShow, 800)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY, "1")
    setShowTutorial(false)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      <div
        className={cn(
          "transition-all duration-200",
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-64"
        )}
      >
        <Header sidebarCollapsed={sidebarCollapsed} />
        {DEMO_MODE && (
          <div className="fixed top-0 right-0 z-50 bg-orange-500 text-white text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-bl-lg shadow">
            Demo Edition
          </div>
        )}
        <main className="p-6 pb-24 lg:pb-6">{children}</main>
      </div>
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
      {AI_ENABLED && <AIAssistant />}
      <BottomNav />
    </div>
  )
}

export { DashboardLayout }
