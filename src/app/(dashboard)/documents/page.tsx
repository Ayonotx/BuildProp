"use client"

import React, { useState, useRef } from "react"
import { useCrud } from "@/hooks/use-crud"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  FileText, FolderOpen, Upload, Eye, Trash2, Download,
  File, FileSpreadsheet, Image, Camera,
} from "lucide-react"
import { formatDate } from "@/lib/utils"

interface Document {
  id: string
  name: string
  fileUrl: string
  fileType: string
  fileSize: number
  category: string
  uploadedBy: string
  version: number
  createdAt: string
}

const defaultForm = {
  name: "",
  fileType: "pdf",
  fileSize: 0,
  category: "general",
  uploadedBy: "System",
}

function FileTypeIcon({ fileType }: { fileType: string }) {
  const t = fileType.toLowerCase()
  if (t === "pdf") return <FileText className="h-5 w-5 text-red-500" />
  if (t === "doc" || t === "docx") return <FileText className="h-5 w-5 text-blue-500" />
  if (t === "xls" || t === "xlsx") return <FileSpreadsheet className="h-5 w-5 text-green-500" />
  if (t === "jpg" || t === "jpeg" || t === "png") return <Image className="h-5 w-5 text-purple-500" />
  return <File className="h-5 w-5 text-slate-500" />
}

function FileTypeBadgeColor({ fileType }: { fileType: string }) {
  const t = fileType.toLowerCase()
  if (t === "pdf") return "destructive"
  if (t === "doc" || t === "docx") return "default"
  if (t === "xls" || t === "xlsx") return "success"
  return "secondary"
}

export default function DocumentsPage() {
  const {
    data: documents, loading, showModal, setShowModal,
    formData, setFormData, saving, fetchData, handleSave,
    editingItem, setEditingItem,
  } = useCrud<Document>({ apiPath: "/api/documents", defaultForm })

  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const categories = [...new Set(documents.map((d: Document) => d.category))]

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 B"
    if (bytes < 1024) return bytes + " B"
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB"
    return (bytes / 1048576).toFixed(1) + " MB"
  }

  const recentCount = documents.filter((d: Document) => {
    const diff = Date.now() - new Date(d.createdAt).getTime()
    return diff < 7 * 24 * 60 * 60 * 1000
  }).length

  const stats = [
    { label: "Total Documents", value: documents.length, icon: FileText, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Categories", value: categories.length, icon: FolderOpen, color: "text-orange-500", bg: "bg-orange-50" },
    { label: "Recent Uploads", value: recentCount, icon: Upload, color: "text-emerald-500", bg: "bg-emerald-50" },
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf"
      setFormData({
        ...formData,
        name: formData.name || file.name.replace(/\.[^/.]+$/, ""),
        fileType: ext,
        fileSize: file.size,
      })
    }
  }

  const handleSaveDocument = async () => {
    setUploading(true)
    setUploadProgress("Saving document...")
    try {
      let fileUrl = "/"
      let fileType = formData.fileType
      let fileSize = formData.fileSize

      if (selectedFile) {
        setUploadProgress("Uploading file...")
        const uploadForm = new FormData()
        uploadForm.append("file", selectedFile)
        const uploadRes = await fetch("/api/documents/upload", {
          method: "POST",
          body: uploadForm,
        })
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json()
          fileUrl = uploadData.path
          fileSize = uploadData.size
          const ext = selectedFile.name.split(".").pop()?.toLowerCase() || "pdf"
          fileType = ext
        }
      }

      setUploadProgress("Saving to database...")
      const url = editingItem
        ? `/api/documents/${(editingItem as any).id}`
        : "/api/documents"
      const method = editingItem ? "PUT" : "POST"

      const body = {
        ...formData,
        fileUrl,
        fileType,
        fileSize,
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) throw new Error("Failed")

      setShowModal(false)
      setEditingItem(null)
      setSelectedFile(null)
      setFormData(defaultForm)
      fetchData()
    } catch (err) {
      console.error("Error saving document:", err)
    } finally {
      setUploading(false)
      setUploadProgress("")
    }
  }

  const openEditModal = (doc: Document) => {
    setEditingItem(doc)
    setFormData({
      name: doc.name,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      category: doc.category,
      uploadedBy: doc.uploadedBy,
    })
    setSelectedFile(null)
    setShowModal(true)
  }

  const openCreateModal = () => {
    setEditingItem(null)
    setFormData(defaultForm)
    setSelectedFile(null)
    setShowModal(true)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Management"
        description="Store and manage all company documents"
        action={{ label: "Upload Document", icon: Upload, onClick: openCreateModal }}
      />

      <StatsGrid stats={stats} />

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <LoadingState message="Loading documents..." />
          ) : documents.length === 0 ? (
            <EmptyState message="No documents yet." />
          ) : (
            <div className="space-y-3">
              {documents.map((doc: Document) => (
                <div key={doc.id} className="flex items-center gap-4 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50">
                    <FileTypeIcon fileType={doc.fileType} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{doc.name}</p>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                      <Badge variant={FileTypeBadgeColor({ fileType: doc.fileType })} className="text-xs">{doc.fileType.toUpperCase()}</Badge>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>·</span>
                      <span className="capitalize">{doc.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500">{doc.uploadedBy}</p>
                    <p className="text-xs text-slate-400">{formatDate(doc.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {doc.fileUrl && doc.fileUrl !== "/" && (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-blue-50 rounded-lg"
                        title="Download"
                      >
                        <Download className="h-4 w-4 text-blue-500" />
                      </a>
                    )}
                    <button
                      onClick={() => openEditModal(doc)}
                      className="p-2 hover:bg-slate-100 rounded-lg"
                      title="View"
                    >
                      <Eye className="h-4 w-4 text-slate-500" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Are you sure you want to delete this document?")) return
                        try {
                          await fetch(`/api/documents/${doc.id}`, { method: "DELETE" })
                          fetchData()
                        } catch (err) {
                          console.error("Error deleting:", err)
                        }
                      }}
                      className="p-2 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CRUDModal
        open={showModal}
        onClose={() => { setShowModal(false); setSelectedFile(null) }}
        title={editingItem ? "Edit Document" : "Upload Document"}
        onSave={handleSaveDocument}
        saving={saving || uploading}
        disabled={!formData.name}
      >
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">File</label>
            <div className="flex gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-4 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                <Camera className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-600">Take Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <label className="flex-1 flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 p-4 cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors">
                <Upload className="h-5 w-5 text-slate-400" />
                <span className="text-sm text-slate-600">Upload File</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
            {selectedFile && (
              <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                <FileTypeIcon fileType={selectedFile.name.split(".").pop() || ""} />
                <span>{selectedFile.name}</span>
                <span className="text-slate-400">({formatFileSize(selectedFile.size)})</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">File Type</label>
              <select value={formData.fileType} onChange={(e) => setFormData({ ...formData, fileType: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="pdf">PDF</option>
                <option value="doc">DOC</option>
                <option value="docx">DOCX</option>
                <option value="xls">XLS</option>
                <option value="xlsx">XLSX</option>
                <option value="jpg">JPG</option>
                <option value="png">PNG</option>
                <option value="txt">TXT</option>
                <option value="csv">CSV</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                <option value="general">General</option>
                <option value="contract">Contract</option>
                <option value="permit">Permit</option>
                <option value="report">Report</option>
                <option value="policy">Policy</option>
              </select>
            </div>
          </div>
          {uploading && uploadProgress && (
            <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 rounded-lg p-3">
              <Upload className="h-4 w-4 animate-pulse" />
              {uploadProgress}
            </div>
          )}
        </div>
      </CRUDModal>
    </div>
  )
}
