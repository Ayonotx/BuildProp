import React from "react"
import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"

interface Action {
  label: string
  icon?: LucideIcon
  onClick: () => void
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

interface PageHeaderProps {
  title: string
  description?: string
  action?: Action | React.ReactNode
  actions?: Action[]
}

export function PageHeader({ title, description, action, actions }: PageHeaderProps) {
  const isActionObject = (a: unknown): a is Action =>
    !!a && typeof a === "object" && "label" in (a as Record<string, unknown>) && "onClick" in (a as Record<string, unknown>)

  const actionObj = isActionObject(action) ? action : undefined
  const actionNode = action && !isActionObject(action) ? action : undefined

  const allActions = actionObj ? [actionObj, ...(actions || [])] : actions || []

  if (!description && !actionNode && allActions.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm text-slate-500">{description}</p>
        )}
      </div>
      <div className="flex gap-3">
        {actionNode}
        {allActions.map((a, i) => {
          const Icon = a.icon
          return (
            <Button
              key={i}
              variant={i === 0 ? "default" : (a.variant || "outline")}
              onClick={a.onClick}
            >
              {Icon && <Icon className="h-4 w-4 mr-2" />}
              {a.label}
            </Button>
          )
        })}
      </div>
    </div>
  )
}
