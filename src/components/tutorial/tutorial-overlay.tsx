"use client"

import React, { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

const TUTORIAL_KEY = "buildprop_tutorial_done"

interface TutorialStep {
  title: string
  description: string
  icon: string
  highlight: string
}

const steps: TutorialStep[] = [
  {
    title: "Welcome to BuildProp!",
    description: "Let's give you a quick tour of your construction and real estate management system.",
    icon: "👋",
    highlight: "center",
  },
  {
    title: "Dashboard",
    description: "This is your dashboard with key metrics, charts, and AI insights at a glance.",
    icon: "📊",
    highlight: "sidebar-dashboard",
  },
  {
    title: "Sidebar Navigation",
    description: "Use the sidebar to navigate between 28+ modules covering every aspect of your business.",
    icon: "🧭",
    highlight: "sidebar",
  },
  {
    title: "Projects",
    description: "Manage construction projects from planning to completion with budget tracking and milestones.",
    icon: "🏗️",
    highlight: "sidebar-projects",
  },
  {
    title: "Properties",
    description: "Track your real estate portfolio, listings, and property management tasks.",
    icon: "🏢",
    highlight: "sidebar-properties",
  },
  {
    title: "Finance",
    description: "Handle invoicing, payments, accounting, and financial reports in one place.",
    icon: "💰",
    highlight: "sidebar-finance",
  },
  {
    title: "AI Assistant",
    description: "Get AI-powered insights using Ollama or cloud AI providers for smarter decisions.",
    icon: "🤖",
    highlight: "sidebar-ai",
  },
  {
    title: "Settings",
    description: "Configure your company, users, backups, and integrations to fit your workflow.",
    icon: "⚙️",
    highlight: "sidebar-settings",
  },
  {
    title: "You're All Set!",
    description: "You're ready to start. Explore and make BuildProp yours! You can re-open this tutorial anytime from the header.",
    icon: "🎉",
    highlight: "center",
  },
]

function getHighlightPosition(highlight: string): { top: string; left: string; width: string; height: string } | null {
  if (highlight === "center") return null

  const sidebar = document.querySelector("[data-tutorial-sidebar]")
  const navItems = document.querySelectorAll("[data-tutorial-nav]")

  if (!sidebar) return null

  const sidebarRect = sidebar.getBoundingClientRect()

  const itemMap: Record<string, number> = {
    "sidebar-dashboard": 0,
    "sidebar-projects": 1,
    "sidebar-properties": 2,
    "sidebar-ai": 17,
    "sidebar-settings": 27,
  }

  if (highlight === "sidebar") {
    return {
      top: `${sidebarRect.top}px`,
      left: `${sidebarRect.left}px`,
      width: `${sidebarRect.width}px`,
      height: `${sidebarRect.height}px`,
    }
  }

  const idx = itemMap[highlight]
  if (idx !== undefined && navItems[idx]) {
    const rect = navItems[idx].getBoundingClientRect()
    return {
      top: `${rect.top - 4}px`,
      left: `${rect.left - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
    }
  }

  return null
}

interface TutorialOverlayProps {
  onComplete: () => void
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [spotlight, setSpotlight] = useState<{ top: string; left: string; width: string; height: string } | null>(null)

  const updateSpotlight = useCallback(() => {
    const pos = getHighlightPosition(steps[currentStep].highlight)
    setSpotlight(pos)
  }, [currentStep])

  useEffect(() => {
    const timer = setTimeout(updateSpotlight, 50)
    window.addEventListener("resize", updateSpotlight)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", updateSpotlight)
    }
  }, [updateSpotlight])

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  function handlePrev() {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const step = steps[currentStep]
  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0

  const tooltipStyle = spotlight
    ? { top: `${Math.min(parseInt(spotlight.top) + parseInt(spotlight.height) + 12, window.innerHeight - 220)}px`, left: `${Math.min(parseInt(spotlight.left), window.innerWidth - 400)}px` }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }

  return (
    <div className="fixed inset-0 z-[9999]" onClick={(e) => e.stopPropagation()}>
      <div className="absolute inset-0 bg-black/60" />

      {spotlight && (
        <div
          className="absolute rounded-xl ring-4 ring-orange-500/60 transition-all duration-500"
          style={{
            top: spotlight.top,
            left: spotlight.left,
            width: spotlight.width,
            height: spotlight.height,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      )}

      <div
        className="absolute bg-white rounded-2xl shadow-2xl w-[380px] max-w-[90vw] p-6 transition-all duration-500"
        style={tooltipStyle}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{step.icon}</span>
            <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
          </div>
          <button onClick={onComplete} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{step.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentStep ? "bg-orange-500 w-6" : i < currentStep ? "bg-orange-300 w-1.5" : "bg-slate-200 w-1.5"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {!isLast && (
          <button
            onClick={onComplete}
            className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  )
}


