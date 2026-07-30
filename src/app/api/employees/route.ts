export const dynamic = "force-dynamic"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    })

    // Fetch user data separately since Prisma schema doesn't have user relation
    const userIds = employees.map(e => e.userId).filter((id): id is string => id !== null)
    const users = userIds.length > 0
      ? await prisma.user.findMany({ where: { id: { in: userIds } } })
      : []
    const userMap = Object.fromEntries(users.map(u => [u.id, u]))

    const result = employees.map(e => ({
      ...e,
      firstName: (e.userId && userMap[e.userId]?.firstName) || e.designation || e.employeeId || "",
      lastName: (e.userId && userMap[e.userId]?.lastName) || e.designation || e.employeeId || "",
      email: (e.userId && userMap[e.userId]?.email) || "",
    }))

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}