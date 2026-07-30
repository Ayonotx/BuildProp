export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const documents = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const result = documents.map((d) => ({
      id: d.id,
      name: d.name,
      fileUrl: d.fileUrl,
      fileType: d.fileType,
      fileSize: d.fileSize,
      category: d.category,
      uploadedBy: d.uploadedBy,
      version: d.version,
      createdAt: d.createdAt,
    }))

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, fileUrl, fileType, fileSize, category, uploadedBy } = body

    if (!name || name.trim().length === 0) {
      return Response.json({ error: 'Document name is required' }, { status: 400 })
    }

    const document = await prisma.document.create({
      data: {
        name,
        fileUrl: fileUrl || '/',
        fileType: fileType || 'pdf',
        fileSize: fileSize || 0,
        category: category || 'general',
        uploadedBy: uploadedBy || 'System',
      },
    })

    return Response.json(document, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
