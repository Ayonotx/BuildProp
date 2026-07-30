"use client"

import React, { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface CRUDModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  onSave: () => void
  saving: boolean
  saveLabel?: string
  saveDisabled?: boolean
  disabled?: boolean
  maxWidth?: string
}

export function CRUDModal({
  open,
  onClose,
  title,
  children,
  onSave,
  saving,
  saveLabel = "Save",
  saveDisabled = false,
  disabled = false,
  maxWidth = "max-w-2xl",
}: CRUDModalProps) {
  useEffect(() => {
    if (!open) return
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", handleEsc)
    return () => document.removeEventListener("keydown", handleEsc)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className={`bg-white rounded-xl shadow-xl w-full ${maxWidth} mx-4 max-h-[90vh] overflow-y-auto`}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
        <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || saveDisabled || disabled}>
            {saving ? "Saving..." : saveLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
