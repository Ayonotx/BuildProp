"use client"
import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)
    setIsOffline(!navigator.onLine)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff className="h-4 w-4" />
      You&apos;re offline — some features may be limited
    </div>
  )
}
