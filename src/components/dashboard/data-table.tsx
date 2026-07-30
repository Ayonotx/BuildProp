"use client"

import React, { useState, useMemo } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"

export interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  className?: string
  sortable?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading: boolean
  emptyMessage?: string
  loadingMessage?: string
  onRowClick?: (item: T) => void
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  loading,
  emptyMessage = "No data found.",
  loadingMessage = "Loading...",
  onRowClick,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedData = useMemo(() => {
    if (!sortKey) return data
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey]
      const bVal = (b as any)[sortKey]
      if (aVal == null) return 1
      if (bVal == null) return -1
      const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true })
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [data, sortKey, sortDir])

  if (loading) {
    return (
      <div className="py-12 text-center text-slate-500">{loadingMessage}</div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400">{emptyMessage}</div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => col.sortable !== false && col.key !== 'actions' && handleSort(col.key)}
                className={`text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase ${col.key !== 'actions' && col.sortable !== false ? 'cursor-pointer select-none hover:text-slate-700' : ''} ${col.className || ""}`}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.key !== 'actions' && col.sortable !== false && sortKey === col.key && (
                    sortDir === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr
              key={item.id}
              onClick={() => onRowClick?.(item)}
              className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3 px-4 ${col.className || ""}`}>
                  {col.render
                    ? col.render(item)
                    : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
