import React from "react"
import { Button } from "@/components/ui/button"
import type { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  message?: string
  icon?: LucideIcon
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({
  message = "No data found.",
  icon: Icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="py-12 text-center">
      {Icon && <Icon className="h-12 w-12 text-slate-300 mx-auto mb-3" />}
      <p className="text-slate-400 mb-4">{message}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  )
}
