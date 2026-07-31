"use client"

import React, { useState, useRef, useCallback } from "react"
import { useCrud } from "@/hooks/use-crud"
import { PageHeader } from "@/components/dashboard/page-header"
import { StatsGrid } from "@/components/dashboard/stats-grid"
import { CRUDModal } from "@/components/dashboard/crud-modal"
import { LoadingState } from "@/components/dashboard/loading-state"
import { EmptyState } from "@/components/dashboard/empty-state"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Building2, Home, Store, MapPin, Pencil, Trash2, Download, X, ChevronLeft, ChevronRight, Eye, Upload, Share2 } from "lucide-react"
import { useToast } from "@/components/dashboard/toast"
import { exportToCSV } from "@/lib/export-csv"
import { exportToPdf } from "@/lib/pdf-export"
import { generatePropertyBrochurePDF } from "@/lib/pdf-generator"
import { formatCurrency, statusVariant, statusLabel } from "@/lib/utils"

interface Property {
  id: string
  name: string
  slug: string
  description: string | null
  propertyType: string
  status: string
  price: string
  rentalPrice: string | null
  areaSqft: string | null
  bedrooms: number | null
  bathrooms: number | null
  address: string | null
  city: string | null
  state: string | null
  images: string | null
}

const defaultForm = {
  name: "",
  description: "",
  propertyType: "house",
  status: "available",
  price: "",
  rentalPrice: "",
  areaSqft: "",
  bedrooms: "",
  bathrooms: "",
  address: "",
  city: "",
  state: "",
}

function getPropertyImages(images: string | null): string[] {
  if (!images) return []
  try {
    const parsed = JSON.parse(images)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function uploadImages(files: FileList): Promise<string[]> {
  const fileData: { name: string; data: string; type: string }[] = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(file)
    })
    fileData.push({ name: file.name, data: base64, type: file.type })
  }
  const res = await fetch("/api/properties/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: fileData })
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || "Upload failed")
  return data.files.map((f: { url: string }) => f.url)
}

export default function PropertiesPage() {
  const { toast } = useToast()
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<string[]>([])
  const [detailProperty, setDetailProperty] = useState<Property | null>(null)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    data: properties, loading, showModal, setShowModal,
    editingItem, setEditingItem, formData, setFormData,
    saving, fetchData, handleSave, handleDelete,
  } = useCrud<Property>({
    apiPath: "/api/properties",
    defaultForm,
    transformBody: (form) => ({
      ...form,
      price: form.price ? Number(form.price) : undefined,
      rentalPrice: form.rentalPrice ? Number(form.rentalPrice) : undefined,
      areaSqft: form.areaSqft ? Number(form.areaSqft) : undefined,
      bedrooms: form.bedrooms !== "" ? Number(form.bedrooms) : undefined,
      bathrooms: form.bathrooms !== "" ? Number(form.bathrooms) : undefined,
      images: JSON.stringify([...existingImages, ...previewUrls.filter(u => u.startsWith("/api/"))]),
    }),
    onSuccess: (action) => {
      resetImages()
      if (action === "save") {
        toast({ title: "Success", description: editingItem ? "Property updated successfully" : "Property created successfully", variant: "success" })
      } else {
        toast({ title: "Success", description: "Property deleted successfully", variant: "success" })
      }
    },
  })

  function resetImages() {
    setSelectedFiles(null)
    setPreviewUrls([])
    setExistingImages([])
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  function openCreate() {
    resetImages()
    setEditingItem(null)
    setFormData(defaultForm)
    setShowModal(true)
  }

  function openEdit(item: Property) {
    resetImages()
    setEditingItem(item)
    setExistingImages(getPropertyImages(item.images))
    setFormData({
      name: item.name,
      description: item.description || "",
      propertyType: item.propertyType,
      status: item.status,
      price: item.price || "",
      rentalPrice: item.rentalPrice || "",
      areaSqft: item.areaSqft || "",
      bedrooms: item.bedrooms != null ? String(item.bedrooms) : "",
      bathrooms: item.bathrooms != null ? String(item.bathrooms) : "",
      address: item.address || "",
      city: item.city || "",
      state: item.state || "",
    })
    setShowModal(true)
  }

  function openDetail(property: Property) {
    setDetailProperty(property)
    setGalleryIndex(0)
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setSelectedFiles(files)
    const urls: string[] = []
    for (let i = 0; i < files.length; i++) {
      urls.push(URL.createObjectURL(files[i]))
    }
    setPreviewUrls(urls)
  }, [])

  const removeExistingImage = useCallback((index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index))
  }, [])

  const removePreviewImage = useCallback((index: number) => {
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
    setSelectedFiles(null)
  }, [])

  async function handleSaveWithUpload() {
    if (selectedFiles && selectedFiles.length > 0) {
      setUploading(true)
      try {
        const urls = await uploadImages(selectedFiles)
        const allImages = [...existingImages, ...urls]
        const editingId = editingItem ? (editingItem as any).id : null
        const url = editingId ? `/api/properties/${editingId}` : "/api/properties"
        const method = editingId ? "PUT" : "POST"
        const body: Record<string, unknown> = {
          ...formData,
          price: formData.price ? Number(formData.price) : undefined,
          rentalPrice: formData.rentalPrice ? Number(formData.rentalPrice) : undefined,
          areaSqft: formData.areaSqft ? Number(formData.areaSqft) : undefined,
          bedrooms: formData.bedrooms !== "" ? Number(formData.bedrooms) : undefined,
          bathrooms: formData.bathrooms !== "" ? Number(formData.bathrooms) : undefined,
          images: JSON.stringify(allImages),
        }
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Failed")
        setShowModal(false)
        setEditingItem(null)
        resetImages()
        fetchData()
        toast({ title: "Success", description: editingId ? "Property updated successfully" : "Property created successfully", variant: "success" })
      } catch (err) {
        toast({ title: "Error", description: "Failed to upload images or save property", variant: "error" })
      } finally {
        setUploading(false)
      }
    } else {
      const allImages = [...existingImages]
      const editingId = editingItem ? (editingItem as any).id : null
      const url = editingId ? `/api/properties/${editingId}` : "/api/properties"
      const method = editingId ? "PUT" : "POST"
      const body: Record<string, unknown> = {
        ...formData,
        price: formData.price ? Number(formData.price) : undefined,
        rentalPrice: formData.rentalPrice ? Number(formData.rentalPrice) : undefined,
        areaSqft: formData.areaSqft ? Number(formData.areaSqft) : undefined,
        bedrooms: formData.bedrooms !== "" ? Number(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms !== "" ? Number(formData.bathrooms) : undefined,
        images: JSON.stringify(allImages),
      }
      try {
        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error("Failed")
        setShowModal(false)
        setEditingItem(null)
        resetImages()
        fetchData()
        toast({ title: "Success", description: editingId ? "Property updated successfully" : "Property created successfully", variant: "success" })
      } catch (err) {
        toast({ title: "Error", description: "Failed to save property", variant: "error" })
      }
    }
  }

  const totalProperties = properties.length
  const houses = properties.filter((p: Property) => p.propertyType === "house").length
  const commercial = properties.filter((p: Property) => p.propertyType === "commercial").length
  const land = properties.filter((p: Property) => p.propertyType === "land").length

  const typeLabel = (t: string) => t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())

  const stats = [
    { label: "Total Properties", value: totalProperties, icon: Building2, color: "text-blue-500" },
    { label: "Houses", value: houses, icon: Home, color: "text-emerald-500" },
    { label: "Commercial", value: commercial, icon: Store, color: "text-purple-500" },
    { label: "Land", value: land, icon: MapPin, color: "text-orange-500" },
  ]

  function shareOnWhatsApp(property: Property) {
    const message = encodeURIComponent(
      `\u{1f3e0} ${property.name}\n` +
      `\u{1f4b0} Price: GHS ${Number(property.price).toLocaleString()}\n` +
      `\u{1f4cd} ${property.address || ''}, ${property.city || ''}\n` +
      `\u{1f4d0} ${property.areaSqft || 'N/A'} sqft | ${property.bedrooms || 0} beds | ${property.bathrooms || 0} baths\n` +
      `\nView on BuildProp: ${window.location.origin}/properties`
    )
    window.open(`https://wa.me/?text=${message}`, '_blank')
  }

  function handleExportPdf() {
    exportToPdf({
      title: "Properties",
      subtitle: `${properties.length} propert${properties.length !== 1 ? "ies" : "y"}`,
      headers: ["Name", "Type", "Status", "Price", "Area", "Bedrooms", "Bathrooms", "City"],
      rows: properties.map((p: Property) => [
        p.name, typeLabel(p.propertyType), statusLabel(p.status), formatCurrency(p.price),
        p.areaSqft ? `${Number(p.areaSqft).toLocaleString()} sqft` : "—",
        p.bedrooms != null ? String(p.bedrooms) : "—",
        p.bathrooms != null ? String(p.bathrooms) : "—",
        [p.city, p.state].filter(Boolean).join(", ") || "—",
      ]),
      filename: "properties.pdf",
    })
  }

  const detailImages = detailProperty ? getPropertyImages(detailProperty.images) : []

  return (
    <div className="space-y-6">
      <PageHeader
        title="Properties"
        description="Manage your property inventory"
        action={
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => exportToCSV(properties.map((p: Property) => ({
              Name: p.name, Type: p.propertyType, Status: p.status, Price: p.price,
              "Rental Price": p.rentalPrice || "", "Area (sqft)": p.areaSqft || "",
              Bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
              Bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
              Address: p.address || "", City: p.city || "", State: p.state || "",
            })), "properties.csv")}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
            <Button variant="outline" onClick={handleExportPdf}><Download className="h-4 w-4 mr-2" />Export PDF</Button>
            <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Property</Button>
          </div>
        }
      />

      <StatsGrid stats={stats} />

      {loading ? (
        <LoadingState message="Loading properties..." />
      ) : properties.length === 0 ? (
        <EmptyState message="No properties yet. Add your first property!" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((property: Property) => {
            const images = getPropertyImages(property.images)
            return (
              <Card key={property.id} className="overflow-hidden hover:shadow-md transition-shadow">
                {images.length > 0 ? (
                  <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => openDetail(property)}>
                    <img
                      src={images[0]}
                      alt={property.name}
                      className="h-full w-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
                    />
                    {images.length > 1 && (
                      <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                        {images.length} photos
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); openDetail(property) }}
                      className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-full hover:bg-black/80"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center cursor-pointer" onClick={() => openDetail(property)}>
                    <Building2 className="h-12 w-12 text-slate-300" />
                  </div>
                )}
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-900">{property.name}</h3>
                    <Badge variant={statusVariant(property.status) as any}>{statusLabel(property.status)}</Badge>
                  </div>
                  <p className="text-xs text-slate-400 mb-1">
                    <Badge variant="outline" className="text-[10px]">{typeLabel(property.propertyType)}</Badge>
                  </p>
                  <p className="text-sm text-slate-500 flex items-center gap-1 mb-3">
                    <MapPin className="h-3 w-3" />
                    {[property.city, property.state].filter(Boolean).join(", ") || property.address || "No location"}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                    {property.bedrooms != null && property.bedrooms > 0 && <span>{property.bedrooms} beds</span>}
                    {property.bathrooms != null && property.bathrooms > 0 && <span>{property.bathrooms} baths</span>}
                    {property.areaSqft && <span>{Number(property.areaSqft).toLocaleString()} sqft</span>}
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(property.price)}</p>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => shareOnWhatsApp(property)} title="Share on WhatsApp"><Share2 className="h-4 w-4 text-green-500" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(property)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(property.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {showModal && (
        <CRUDModal
          open={showModal}
          onClose={() => { setShowModal(false); resetImages() }}
          title={editingItem ? "Edit Property" : "New Property"}
          onSave={handleSaveWithUpload}
          saving={saving || uploading}
          disabled={!formData.name || !formData.price}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Price *</label>
                <input type="number" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={3} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Property Type</label>
                <select value={formData.propertyType} onChange={e => setFormData({...formData, propertyType: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="commercial">Commercial</option>
                  <option value="land">Land</option>
                  <option value="warehouse">Warehouse</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400">
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="reserved">Reserved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Rental Price</label>
                <input type="number" value={formData.rentalPrice} onChange={e => setFormData({...formData, rentalPrice: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Area (sqft)</label>
                <input type="number" value={formData.areaSqft} onChange={e => setFormData({...formData, areaSqft: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bedrooms</label>
                <input type="number" value={formData.bedrooms} onChange={e => setFormData({...formData, bedrooms: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Bathrooms</label>
                <input type="number" value={formData.bathrooms} onChange={e => setFormData({...formData, bathrooms: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input type="text" value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400" />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Property Images</label>
              <div
                className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-orange-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, GIF, WEBP up to 10MB each</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />

              {(existingImages.length > 0 || previewUrls.length > 0) && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {existingImages.map((url, i) => (
                    <div key={`existing-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeExistingImage(i) }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {previewUrls.map((url, i) => (
                    <div key={`preview-${i}`} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200">
                      <img src={url} alt="" className="h-full w-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); removePreviewImage(i) }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CRUDModal>
      )}

      {detailProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDetailProperty(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">{detailProperty.name}</h2>
              <button onClick={() => setDetailProperty(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {detailImages.length > 0 && (
              <div className="relative">
                <div className="h-80 bg-slate-100 flex items-center justify-center overflow-hidden">
                  <img
                    src={detailImages[galleryIndex]}
                    alt={`${detailProperty.name} - ${galleryIndex + 1}`}
                    className="h-full w-full object-contain"
                  />
                </div>
                {detailImages.length > 1 && (
                  <>
                    <button
                      onClick={() => setGalleryIndex(prev => (prev - 1 + detailImages.length) % detailImages.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => setGalleryIndex(prev => (prev + 1) % detailImages.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
                      {galleryIndex + 1} / {detailImages.length}
                    </div>
                  </>
                )}
              </div>
            )}

            {detailImages.length > 1 && (
              <div className="p-4 flex gap-2 overflow-x-auto border-b border-slate-200">
                {detailImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${i === galleryIndex ? "border-orange-500" : "border-transparent"}`}
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant={statusVariant(detailProperty.status) as any}>{statusLabel(detailProperty.status)}</Badge>
                <Badge variant="outline">{typeLabel(detailProperty.propertyType)}</Badge>
              </div>

              {detailProperty.description && (
                <p className="text-sm text-slate-600">{detailProperty.description}</p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wide">Price</p>
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(detailProperty.price)}</p>
                </div>
                {detailProperty.rentalPrice && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Rental Price</p>
                    <p className="text-lg font-bold text-slate-900">{formatCurrency(detailProperty.rentalPrice)}/mo</p>
                  </div>
                )}
                {detailProperty.areaSqft && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Area</p>
                    <p className="text-lg font-bold text-slate-900">{Number(detailProperty.areaSqft).toLocaleString()} sqft</p>
                  </div>
                )}
                {detailProperty.bedrooms != null && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Bedrooms</p>
                    <p className="text-lg font-bold text-slate-900">{detailProperty.bedrooms}</p>
                  </div>
                )}
                {detailProperty.bathrooms != null && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wide">Bathrooms</p>
                    <p className="text-lg font-bold text-slate-900">{detailProperty.bathrooms}</p>
                  </div>
                )}
              </div>

              {(detailProperty.address || detailProperty.city || detailProperty.state) && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="h-4 w-4" />
                  {[detailProperty.address, detailProperty.city, detailProperty.state].filter(Boolean).join(", ")}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200">
                <Button onClick={() => shareOnWhatsApp(detailProperty)} className="bg-green-500 hover:bg-green-600">
                  <Share2 className="h-4 w-4 mr-2" />Share on WhatsApp
                </Button>
                <Button onClick={() => { setDetailProperty(null); openEdit(detailProperty) }}>
                  <Pencil className="h-4 w-4 mr-2" />Edit Property
                </Button>
                <Button variant="outline" onClick={() => generatePropertyBrochurePDF(detailProperty, "BuildProp")}>
                  <Download className="h-4 w-4 mr-2" />Download Brochure
                </Button>
                <Button variant="destructive" onClick={() => { setDetailProperty(null); handleDelete(detailProperty.id) }}>
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
