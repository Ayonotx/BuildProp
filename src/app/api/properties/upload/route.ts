export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]

    if (!files || files.length === 0) {
      return Response.json({ error: 'No files uploaded' }, { status: 400 })
    }

    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'properties')
    await mkdir(uploadDir, { recursive: true })

    const uploadedFiles: { filename: string; url: string; size: number }[] = []

    for (const file of files) {
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      await writeFile(path.join(uploadDir, filename), buffer)
      uploadedFiles.push({
        filename,
        url: `/api/properties/image/${filename}`,
        size: file.size,
      })
    }

    return Response.json({ files: uploadedFiles })
  } catch (error) {
    return Response.json({ error: 'Upload failed' }, { status: 500 })
  }
}
