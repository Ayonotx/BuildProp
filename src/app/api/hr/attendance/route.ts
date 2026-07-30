export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const employees = await prisma.employee.findMany({
      where: { status: 'active' },
      include: { attendance: true },
      orderBy: { createdAt: 'desc' },
    })

    const attendance = await prisma.attendance.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
      },
      include: { employee: true },
    })

    const attendanceMap = new Map<string, typeof attendance[0]>()
    for (const record of attendance) {
      attendanceMap.set(record.employeeId, record)
    }

    const todayRecords = employees.map((emp) => {
      const record = attendanceMap.get(emp.id)
      if (record) {
        let hours = 0
        if (record.clockIn && record.clockOut) {
          hours = (new Date(record.clockOut).getTime() - new Date(record.clockIn).getTime()) / (1000 * 60 * 60)
        }
        return {
          id: record.id,
          employeeId: emp.employeeId,
          employeeName: emp.designation,
          employeeDbId: emp.id,
          clockIn: record.clockIn,
          clockOut: record.clockOut,
          status: record.status,
          hours: Math.round(hours * 100) / 100,
          date: record.date,
        }
      }
      return {
        id: null,
        employeeId: emp.employeeId,
        employeeName: emp.designation,
        employeeDbId: emp.id,
        clockIn: null,
        clockOut: null,
        status: 'absent',
        hours: 0,
        date: today,
      }
    })

    const presentToday = todayRecords.filter((r) => r.status === 'present' || r.status === 'late').length
    const absentToday = todayRecords.filter((r) => r.status === 'absent').length
    const lateToday = todayRecords.filter((r) => r.status === 'late').length
    const avgHours = todayRecords.filter((r) => r.hours > 0).reduce((sum, r) => sum + r.hours, 0) / (todayRecords.filter((r) => r.hours > 0).length || 1)

    return Response.json({
      records: todayRecords,
      stats: {
        presentToday,
        absentToday,
        lateToday,
        avgHours: Math.round(avgHours * 100) / 100,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, status, clockIn, clockOut } = body

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const existing = await prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: today } },
    })

    if (existing) {
      const updated = await prisma.attendance.update({
        where: { id: existing.id },
        data: {
          status: status || existing.status,
          clockIn: clockIn ? new Date(clockIn) : existing.clockIn,
          clockOut: clockOut ? new Date(clockOut) : existing.clockOut,
        },
      })
      return Response.json(updated)
    }

    const record = await prisma.attendance.create({
      data: {
        id: crypto.randomUUID(),
        employeeId,
        date: today,
        clockIn: clockIn ? new Date(clockIn) : null,
        clockOut: clockOut ? new Date(clockOut) : null,
        status: status || 'present',
      },
    })

    return Response.json(record, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
