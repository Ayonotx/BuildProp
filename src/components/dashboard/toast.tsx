"use client"

import React, { createContext, useContext, useState, useCallback, useRef } from "react"
import { CheckCircle2, XCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Toast {
  id: number
  title: string
  description?: string
  variant: "success" | "error" | "info"
}

interface ToastContextValue {
  toast: (t: string | { title: string; description?: string; variant?: "success" | "error" | "info" }) => void
  toasts: Toast[]
  removeToast: (id: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}

let nextId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: string | { title: string; description?: string; variant?: "success" | "error" | "info" }) => {
      const normalized = typeof input === "string"
        ? { title: input, variant: "info" as const }
        : { title: input.title, description: input.description, variant: input.variant || "info" as const }
      const id = ++nextId
      setToasts((prev) => [...prev, { id, title: normalized.title, description: normalized.description, variant: normalized.variant }])
      const timer = setTimeout(() => removeToast(id), 4000)
      timerRef.current.push(timer)
    },
    [removeToast]
  )

  return (
    <ToastContext.Provider value={{ toast, toasts, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-500" />,
  error: <XCircle className="h-5 w-5 text-red-500" />,
  info: <Info className="h-5 w-5 text-blue-500" />,
}

const borderColors = {
  success: "border-l-emerald-500",
  error: "border-l-red-500",
  info: "border-l-blue-500",
}

export function ToastContainer() {
  const ctx = useContext(ToastContext)
  if (!ctx || ctx.toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
      {ctx.toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "bg-white rounded-lg shadow-lg border border-slate-200 border-l-4 p-4 flex items-start gap-3 animate-in slide-in-from-right",
            borderColors[t.variant]
          )}
        >
          {icons[t.variant]}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900">{t.title}</p>
            {t.description && (
              <p className="text-xs text-slate-500 mt-0.5">{t.description}</p>
            )}
          </div>
          <button
            onClick={() => ctx.removeToast(t.id)}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
