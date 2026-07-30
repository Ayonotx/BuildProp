import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ToastProvider } from "@/components/dashboard/toast"
import { NotificationProvider } from "@/contexts/notification-context"
import { OfflineIndicator } from "@/components/offline-indicator"

export default function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NotificationProvider>
      <ToastProvider>
        <OfflineIndicator />
        <DashboardLayout>{children}</DashboardLayout>
      </ToastProvider>
    </NotificationProvider>
  )
}
