"use client"

import React, { useState, useEffect, useCallback } from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"
import { BottomNav } from "./bottom-nav"
import { cn } from "@/lib/utils"
import TutorialOverlay from "@/components/tutorial/tutorial-overlay"
import { AIAssistant } from "@/components/ai/ai-assistant"

const TUTORIAL_KEY = "buildprop_tutorial_done"

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)

  useEffect(() => {
    const done = localStorage.getItem(TUTORIAL_KEY)
    if (!done) {
      const timer = setTimeout(() => setShowTutorial(true), 800)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleTutorialComplete = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY, "true")
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
        <main className="p-6 pb-24 lg:pb-6">{children}</main>
      </div>
      {showTutorial && <TutorialOverlay onComplete={handleTutorialComplete} />}
      <AIAssistant />
      <BottomNav />
    </div>
  )
}

export { DashboardLayout }
