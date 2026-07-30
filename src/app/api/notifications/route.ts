export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return Response.json(notifications)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    if (body.isRead === true) {
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      })
      return Response.json({ success: true })
    }
    return Response.json({ error: "Invalid request" }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
