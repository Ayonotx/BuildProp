export const dynamic = 'force-dynamic'

import { readFile } from 'fs/promises'
import { join } from 'path'
import { NextResponse } from 'next/server'

const MIME_TYPES: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.json': 'application/json',
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
    }

    const filePath = join(process.cwd(), 'data', 'uploads', filename)
    const fileBuffer = await readFile(filePath)

    const ext = '.' + filename.split('.').pop()?.toLowerCase()
    const contentType = MIME_TYPES[ext] || 'application/octet-stream'

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename.replace(/^\d+-/, '')}"`,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'File not found'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
