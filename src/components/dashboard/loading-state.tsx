import React from "react"

interface LoadingStateProps {
  message?: string
  fullPage?: boolean
}

export function LoadingState({
  message = "Loading...",
  fullPage = false,
}: LoadingStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-slate-500 ${
        fullPage ? "py-24" : "py-12"
      }`}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 mb-3" />
      <p className="text-sm">{message}</p>
    </div>
  )
}
