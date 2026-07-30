"use client"

import { useState, useEffect, useCallback } from "react"

interface UseCrudOptions {
  apiPath: string
  defaultForm: Record<string, any>
  transformBody?: (data: Record<string, any>) => unknown
  onSuccess?: (action: "save" | "delete") => void
}

interface UseCrudReturn<T> {
  data: T[]
  setData: React.Dispatch<React.SetStateAction<T[]>>
  loading: boolean
  error: string | null
  showModal: boolean
  setShowModal: (open: boolean) => void
  editingItem: T | null
  setEditingItem: (item: T | null) => void
  formData: Record<string, any>
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>
  saving: boolean
  fetchData: () => Promise<void>
  handleSave: () => Promise<void>
  handleDelete: (id: string) => Promise<void>
}

export function useCrud<T = any>(
  options: UseCrudOptions
): UseCrudReturn<T> {
  const { apiPath, defaultForm, transformBody, onSuccess } = options

  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState<T | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>(defaultForm)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiPath)
      const json = await res.json()
      if (Array.isArray(json)) setData(json as T[])
    } catch {
      setError("Failed to load data")
    } finally {
      setLoading(false)
    }
  }, [apiPath])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(apiPath)
        const json = await res.json()
        if (!cancelled && Array.isArray(json)) setData(json as T[])
      } catch {
        if (!cancelled) setError("Failed to load data")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [apiPath])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const url = editingItem ? `${apiPath}/${(editingItem as any).id}` : apiPath
      const method = editingItem ? "PUT" : "POST"
      const body = transformBody ? transformBody(formData) : formData
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error("Failed")
      setShowModal(false)
      setEditingItem(null)
      fetchData()
      onSuccess?.("save")
    } catch (err) {
      console.error("Error saving:", err)
    } finally {
      setSaving(false)
    }
  }, [apiPath, editingItem, formData, transformBody, fetchData, onSuccess])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this item?")) return
      try {
        await fetch(`${apiPath}/${id}`, { method: "DELETE" })
        fetchData()
        onSuccess?.("delete")
      } catch (err) {
        console.error("Error deleting:", err)
      }
    },
    [apiPath, fetchData, onSuccess]
  )

  return {
    data,
    setData,
    loading,
    error,
    showModal,
    setShowModal,
    editingItem,
    setEditingItem,
    formData,
    setFormData,
    saving,
    fetchData,
    handleSave,
    handleDelete,
  }
}
