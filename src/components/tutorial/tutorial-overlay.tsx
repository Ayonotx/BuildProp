"use client"

import React, { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { AI_ENABLED } from "@/lib/features"

const TUTORIAL_KEY = "buildprop_tutorial_done"

interface TutorialStep {
  title: string
  description: string
  icon: string
  /** "center" | "sidebar" | "header" | CSS selector for a nav item (e.g. [data-tutorial-nav][href="/projects"]) */
  highlight: string
}

const ALL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to BuildProp!",
    description:
      "Welcome! This is your all-in-one construction and real estate management platform. Let's take a quick tour so you know exactly where everything lives and what you can do.",
    icon: "👋",
    highlight: "center",
  },
  {
    title: "Dashboard",
    description:
      "Your command center. KPI cards track active projects, revenue, available properties, and outstanding balances. Charts, recent activity, and upcoming tasks are all right here at a glance.",
    icon: "📊",
    highlight: '[data-tutorial-nav][href="/"]',
  },
  {
    title: "Sidebar Navigation",
    description:
      "Every module lives in this sidebar, organized into Operations, Finance, Resources, People, and System groups. Click any item to jump straight in — no hunting through menus.",
    icon: "🧭",
    highlight: "sidebar",
  },
  {
    title: "Search & Notifications",
    description:
      "Search projects, properties, and clients from the top bar. Notifications keep you on top of payments, deadlines, and stock alerts, and the help icon reopens this tour anytime.",
    icon: "🔍",
    highlight: "header",
  },
  {
    title: "Projects",
    description:
      "Create construction projects, set budgets and milestones, assign teams, and track progress from planning to handover. Profitability is measured automatically so you always know how each build is doing.",
    icon: "🏗️",
    highlight: '[data-tutorial-nav][href="/projects"]',
  },
  {
    title: "Properties",
    description:
      "Manage your real estate portfolio — listings, availability, owners, and maintenance. Keep every unit's status current so sales always see accurate inventory.",
    icon: "🏢",
    highlight: '[data-tutorial-nav][href="/properties"]',
  },
  {
    title: "Sales & CRM",
    description:
      "Track your sales pipeline and deals, then manage follow-ups with the built-in CRM. Contacts, leads, and client communications flow in one place so no opportunity slips away.",
    icon: "🤝",
    highlight: '[data-tutorial-nav][href="/sales"]',
  },
  {
    title: "Finance & Accounting",
    description:
      "The heart of your books — general ledger, chart of accounts, and journal entries. Record transactions and reconcile everything from one dashboard.",
    icon: "💰",
    highlight: '[data-tutorial-nav][href="/finance"]',
  },
  {
    title: "Invoices",
    description:
      "Create and send invoices, track their status, and know exactly what's outstanding. Payments you record link back to invoices automatically.",
    icon: "🧾",
    highlight: '[data-tutorial-nav][href="/invoices"]',
  },
  {
    title: "Payments & Installments",
    description:
      "Record incoming and outgoing payments and manage installment schedules for property sales. Every payment updates your financial reports in real time.",
    icon: "💳",
    highlight: '[data-tutorial-nav][href="/payments"]',
  },
  {
    title: "Inventory & Procurement",
    description:
      "Keep stock levels in check and raise purchase orders for materials and supplies. Reorder alerts help make sure your sites never run dry.",
    icon: "📦",
    highlight: '[data-tutorial-nav][href="/inventory"]',
  },
  {
    title: "HR & Payroll",
    description:
      "Manage employees, attendance, and payroll in one place. Run payslips and keep personnel records organized without jumping between tools.",
    icon: "👥",
    highlight: '[data-tutorial-nav][href="/hr"]',
  },
  {
    title: "Tasks & Calendar",
    description:
      "Assign tasks, set priorities and deadlines, and see everything on the shared calendar. Stay on top of what's due across all your projects.",
    icon: "📅",
    highlight: '[data-tutorial-nav][href="/tasks"]',
  },
  {
    title: "Reports",
    description:
      "Generate P&L statements, A/R aging, and other business reports. Export or print them for stakeholders in a couple of clicks.",
    icon: "📈",
    highlight: '[data-tutorial-nav][href="/reports"]',
  },
  {
    title: "AI Assistant",
    description:
      "Ask questions in plain language and get AI-powered insights from your own data — summaries, forecasts, and automation that save you hours each week.",
    icon: "🤖",
    highlight: '[data-tutorial-nav][href="/ai"]',
  },
  {
    title: "Settings",
    description:
      "Configure your company details, backups, AI providers, and integrations. This is where you tailor BuildProp to the way your business works.",
    icon: "⚙️",
    highlight: '[data-tutorial-nav][href="/settings"]',
  },
  {
    title: "Users & Roles",
    description:
      "Invite teammates and control what each person can see and do with role-based permissions. Keep sensitive data safe while giving your team what they need.",
    icon: "🛡️",
    highlight: '[data-tutorial-nav][href="/users"]',
  },
  {
    title: "You're All Set!",
    description:
      "That's the tour! You're ready to build. If you ever need a refresher, click the help icon in the header to replay this tutorial anytime.",
    icon: "🎉",
    highlight: "center",
  },
]

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

/** Returns the first match that is actually rendered/visible (handles the duplicated mobile + desktop sidebars). */
function findVisibleElement(selector: string): HTMLElement | null {
  const matches = Array.from(document.querySelectorAll<HTMLElement>(selector))
  for (const el of matches) {
    const style = window.getComputedStyle(el)
    if (style.display === "none" || style.visibility === "hidden") continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) continue
    // Skip elements translated off-screen (e.g. the closed mobile sidebar)
    if (rect.right <= 0 || rect.left >= window.innerWidth) continue
    return el
  }
  return null
}

/** Resolve a step's highlight to the element it should spotlight (or null for centered). */
function resolveHighlight(highlight: string): HTMLElement | null {
  if (highlight === "center") return null
  if (highlight === "sidebar") return findVisibleElement("[data-tutorial-sidebar]")
  if (highlight === "header") return findVisibleElement("[data-tutorial-header]")
  return findVisibleElement(highlight)
}

/** Filter steps down to what actually exists in this installation (AI gating, Users not in sidebar, etc.). */
function buildSteps(): TutorialStep[] {
  return ALL_STEPS.filter((step) => {
    if (step.highlight === "center") return true
    if (step.highlight.includes('href="/ai"') && !AI_ENABLED) return false
    if (step.highlight === "sidebar" || step.highlight === "header") return true
    return !!findVisibleElement(step.highlight)
  })
}

function getHighlightPosition(highlight: string): Rect | null {
  if (highlight === "center") return null
  const el = resolveHighlight(highlight)
  if (!el) return null

  // Scroll off-screen sidebar items into view before measuring position
  if (el.hasAttribute("data-tutorial-nav")) {
    el.scrollIntoView({ block: "center" })
  }

  const rect = el.getBoundingClientRect()
  return {
    top: rect.top - 4,
    left: rect.left - 4,
    width: rect.width + 8,
    height: rect.height + 8,
  }
}

const TOOLTIP_WIDTH = 380
const TOOLTIP_HEIGHT_EST = 250
const VIEWPORT_MARGIN = 12
const GAP = 12

function getTooltipStyle(pos: Rect | null): React.CSSProperties {
  if (!pos) {
    return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight

  const centerX = pos.left + pos.width / 2
  const fitsRight = pos.left + pos.width + GAP + TOOLTIP_WIDTH <= vw - VIEWPORT_MARGIN
  const fitsLeft = pos.left - GAP - TOOLTIP_WIDTH >= VIEWPORT_MARGIN

  let top: number
  let left: number

  if (centerX < vw * 0.4 && fitsRight) {
    // Target hugs the left edge (e.g. the sidebar) → tooltip beside it, vertically centered.
    left = pos.left + pos.width + GAP
    top = pos.top + pos.height / 2 - TOOLTIP_HEIGHT_EST / 2
  } else if (centerX > vw * 0.6 && fitsLeft) {
    // Target hugs the right edge → tooltip to its left.
    left = pos.left - GAP - TOOLTIP_WIDTH
    top = pos.top + pos.height / 2 - TOOLTIP_HEIGHT_EST / 2
  } else {
    // Centered targets → center horizontally, prefer below then above.
    left = pos.left + pos.width / 2 - TOOLTIP_WIDTH / 2
    top = pos.top + pos.height + GAP
    if (top + TOOLTIP_HEIGHT_EST > vh - VIEWPORT_MARGIN) {
      top = pos.top - TOOLTIP_HEIGHT_EST - GAP
    }
  }

  // Clamp so the tooltip never overflows the viewport.
  top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - TOOLTIP_HEIGHT_EST - VIEWPORT_MARGIN))
  left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - TOOLTIP_WIDTH - VIEWPORT_MARGIN))

  return { top: `${top}px`, left: `${left}px` }
}

interface TutorialOverlayProps {
  onComplete: () => void
}

export default function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [steps] = useState<TutorialStep[]>(buildSteps)
  const [currentStep, setCurrentStep] = useState(0)
  const [spotlight, setSpotlight] = useState<Rect | null>(null)

  const step = steps[Math.min(currentStep, steps.length - 1)]

  const updateSpotlight = useCallback(() => {
    const pos = getHighlightPosition(step.highlight)
    setSpotlight(pos)
  }, [step])

  useEffect(() => {
    // Small delay so scrollIntoView + layout settle before measuring.
    const timer = setTimeout(updateSpotlight, 80)
    window.addEventListener("resize", updateSpotlight)
    return () => {
      clearTimeout(timer)
      window.removeEventListener("resize", updateSpotlight)
    }
  }, [updateSpotlight])

  const handleComplete = useCallback(() => {
    localStorage.setItem(TUTORIAL_KEY, "1")
    onComplete()
  }, [onComplete])

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }, [currentStep, steps.length, handleComplete])

  const handlePrev = useCallback(() => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }, [currentStep])

  // Keyboard support: arrows navigate, Escape completes/skips the tour.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") {
        e.preventDefault()
        handleNext()
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        handlePrev()
      } else if (e.key === "Escape") {
        handleComplete()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [handleNext, handlePrev, handleComplete])

  if (!step) return null

  const isLast = currentStep === steps.length - 1
  const isFirst = currentStep === 0
  const progressPct = Math.round(((currentStep + 1) / steps.length) * 100)
  const tooltipStyle = getTooltipStyle(spotlight)

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
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{step.icon}</span>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{step.title}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Step {currentStep + 1} of {steps.length}
              </p>
            </div>
          </div>
          <button
            onClick={handleComplete}
            aria-label="Close tutorial"
            className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>

        <p className="text-sm text-slate-600 mb-6 leading-relaxed">{step.description}</p>

        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {!isFirst && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
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
            onClick={handleComplete}
            className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip tutorial
          </button>
        )}

        {/* Progress bar at the bottom of the tooltip */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
            <span className="font-medium">Progress</span>
            <span className="font-semibold text-orange-500">{progressPct}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-300 mt-1.5 text-center">
            Tip: use arrow keys to navigate, Esc to finish
          </p>
        </div>
      </div>
    </div>
  )
}
