import React from "react"
import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface Stat {
  label: string
  value: string | number
  icon?: LucideIcon
  color?: string
  bg?: string
}

interface StatsGridProps {
  stats: Stat[]
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <Card key={stat.label}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                {Icon && stat.bg ? (
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}>
                    <Icon className={`h-6 w-6 ${stat.color || ""}`} />
                  </div>
                ) : Icon ? (
                  <Icon className={`h-8 w-8 ${stat.color || ""}`} />
                ) : null}
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                  <p className="text-sm text-slate-500">{stat.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
