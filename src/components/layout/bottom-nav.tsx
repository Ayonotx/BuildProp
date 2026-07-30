"use client"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Calendar,
  MoreHorizontal
} from "lucide-react"
import Link from "next/link"

const tabs = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/inventory", label: "Stock", icon: MoreHorizontal },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname === tab.href ||
            (tab.href !== "/" && pathname.startsWith(tab.href))
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 w-full h-full transition-colors ${
                isActive
                  ? "text-orange-500"
                  : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
