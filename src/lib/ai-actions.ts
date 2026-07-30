import { prisma } from './prisma'

export interface AIAction {
  type: string
  description: string
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

function parseRelativeDate(str: string): Date | null {
  const q = str.toLowerCase()
  if (q.includes('tomorrow')) return new Date(Date.now() + 86400000)
  if (q.includes('today')) return new Date()
  if (q.includes('next week')) return new Date(Date.now() + 7 * 86400000)
  if (q.includes('next month')) {
    const d = new Date()
    d.setMonth(d.getMonth() + 1)
    return d
  }

  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  for (let i = 0; i < dayNames.length; i++) {
    if (q.includes(dayNames[i])) {
      const now = new Date()
      const daysUntil = (i - now.getDay() + 7) % 7 || 7
      return new Date(now.getTime() + daysUntil * 86400000)
    }
  }

  const parsed = new Date(str)
  if (!isNaN(parsed.getTime())) return parsed
  return null
}

function parseTime(str: string): { hours: number; minutes: number } {
  let hours = 9, minutes = 0
  if (str) {
    const timeMatch = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    if (timeMatch) {
      hours = parseInt(timeMatch[1])
      minutes = parseInt(timeMatch[2] || '0')
      if (timeMatch[3]?.toLowerCase() === 'pm' && hours < 12) hours += 12
      if (timeMatch[3]?.toLowerCase() === 'am' && hours === 12) hours = 0
    }
  }
  return { hours, minutes }
}

export async function executeAIAction(
  message: string,
  userId: string
): Promise<AIAction | null> {
  const q = message.toLowerCase().trim()

  // ===== TASK CREATION =====
  const moreTaskPatterns = [
    /^(?:i(?:'d|\s+would)?\s+like\s+to|please|can\s+you\s+help\s+me)\s+(?:create|add|set|make)\s+(?:a\s+)?task\s+(?:to\s+|for\s+)?(.+)/i,
    /^(?:don'?t\s+forget\s+(?:to\s+)?|remember\s+to\s+)(.+)/i,
    /^(?:task:\s*)(.+)/i,
    /^(?:check|inspect|review|order|call|email|send|prepare|submit|update|fix|install|test|measure|purchase|buy)\s+(.+?)(?:\s+(?:tomorrow|today|this week|next week|friday|monday|on\s+.+))?$/i,
  ]
  const taskPatterns = [
    /^(?:create|add|new|make)\s+(?:a\s+)?task\s+(?:to\s+|for\s+)?(.+?)(?:\s+(?:on|by|before|due|deadline)\s+(.+))?$/i,
    /^(?:remind me to|don't forget to|i need to)\s+(.+?)(?:\s+(?:on|by|before|due|deadline)\s+(.+))?$/i,
    /^(?:set a (?:task|reminder) to)\s+(.+?)(?:\s+(?:on|by|before|due|deadline)\s+(.+))?$/i,
  ]

  for (const pattern of [...moreTaskPatterns, ...taskPatterns]) {
    const match = q.match(pattern)
    if (match) {
      const title = match[1].trim()
      const dueStr = match[2]?.trim()
      let dueDate = new Date()

      if (dueStr) {
        const parsed = parseRelativeDate(dueStr)
        if (parsed) dueDate = parsed
      } else {
        dueDate = new Date(Date.now() + 86400000)
      }

      const projects = await prisma.project.findMany({ take: 1 })
      const projectId = projects[0]?.id

      if (!projectId) {
        return {
          type: 'task_created',
          description: `⚠️ Task noted but no project exists yet. Create a project first, then tasks can be assigned to it.\n\n📝 Task: "${title}"\n📅 Due: ${dueDate.toLocaleDateString('en-GB')}`,
          success: false,
          error: 'No projects exist',
        }
      }

      const task = await prisma.projectTask.create({
        data: {
          title: title.charAt(0).toUpperCase() + title.slice(1),
          status: 'todo',
          priority: 'medium',
          projectId,
          dueDate,
          assignedTo: userId,
        },
      })

      return {
        type: 'task_created',
        description: `✅ Task created: "${task.title}"\n📅 Due: ${dueDate.toLocaleDateString('en-GB')}\n📋 Status: To Do`,
        success: true,
        data: { taskId: task.id },
      }
    }
  }

  // ===== CALENDAR EVENT / REMINDER =====
  const calendarPatterns = [
    /^(?:schedule|book|set|create|add|plan)\s+(?:a\s+)?(?:meeting|event|visit|inspection|review|call|appointment|demo|showing)\s+(?:with\s+(.+?)\s+)?(?:on|for|at)\s+(.+?)(?:\s+(?:at|@)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?$/i,
    /^(?:set|create|add)\s+(?:a\s+)?reminder\s+(?:to\s+)?(.+?)(?:\s+(?:on|for|at)\s+(.+?))?(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?$/i,
    /^(?:remind me|i need to)\s+(.+?)(?:\s+(?:on|at)\s+(.+?))?(?:\s+at\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?))?$/i,
  ]

  for (const pattern of calendarPatterns) {
    const match = q.match(pattern)
    if (match) {
      const contactOrTitle = match[1]?.trim() || ''
      const dateStr = match[2]?.trim() || ''
      const timeStr = match[3]?.trim() || '09:00'

      let eventDate = parseRelativeDate(dateStr) || new Date()
      const { hours, minutes } = parseTime(timeStr)
      eventDate.setHours(hours, minutes, 0, 0)

      const title = contactOrTitle
        ? `Meeting with ${contactOrTitle}`
        : q.includes('inspection') || q.includes('visit') ? 'Site Inspection' : 'Meeting'

      let contactId: string | null = null
      if (contactOrTitle) {
        const existingContact = await prisma.contact.findFirst({
          where: {
            OR: [
              { firstName: { contains: contactOrTitle.split(' ')[0] || '' } },
              { lastName: { contains: contactOrTitle.split(' ').slice(1).join(' ') || '' } },
            ],
          },
        })
        if (existingContact) {
          contactId = existingContact.id
        } else {
          const newContact = await prisma.contact.create({
            data: {
              type: 'lead',
              firstName: contactOrTitle.split(' ')[0] || contactOrTitle,
              lastName: contactOrTitle.split(' ').slice(1).join(' ') || '',
              notes: 'Auto-created from AI assistant calendar event',
            },
          })
          contactId = newContact.id
        }
      } else {
        const fallbackContact = await prisma.contact.findFirst()
        if (fallbackContact) {
          contactId = fallbackContact.id
        } else {
          const tempContact = await prisma.contact.create({
            data: {
              type: 'lead',
              firstName: 'General',
              lastName: 'Event',
              notes: 'Auto-created placeholder for AI-created event',
            },
          })
          contactId = tempContact.id
        }
      }

      const event = await prisma.appointment.create({
        data: {
          title,
          contactId,
          startTime: eventDate,
          endTime: new Date(eventDate.getTime() + 3600000),
          status: 'scheduled',
          createdBy: userId,
        },
      })

      return {
        type: 'event_created',
        description: `📅 Event scheduled: "${title}"\n📆 ${eventDate.toLocaleDateString('en-GB')} at ${eventDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}\n📋 Status: Scheduled`,
        success: true,
        data: { eventId: event.id },
      }
    }
  }

  // ===== CONTACT CREATION =====
  const contactPatterns = [
    /^(?:add|create|new)\s+(?:a\s+)?(?:contact|client|customer|lead)\s+(?:named?\s+)?(.+?)(?:\s+(\d{10,15}))?$/i,
  ]

  for (const pattern of contactPatterns) {
    const match = q.match(pattern)
    if (match) {
      const fullName = match[1].trim()
      const phone = match[2] || null
      const parts = fullName.split(/\s+/)
      const firstName = parts[0] || fullName
      const lastName = parts.slice(1).join(' ') || ''

      const typeMatch = q.match(/(client|customer|lead|vendor|contractor)/i)
      const contactType = typeMatch ? typeMatch[1].toLowerCase() : 'lead'

      const typeMap: Record<string, string> = {
        client: 'customer',
        customer: 'customer',
        lead: 'lead',
        vendor: 'vendor',
        contractor: 'contractor',
      }

      const contact = await prisma.contact.create({
        data: {
          type: typeMap[contactType] || 'lead',
          firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
          lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          phone: phone || null,
          notes: 'Created via AI assistant',
        },
      })

      return {
        type: 'contact_created',
        description: `👤 Contact created: ${contact.firstName} ${contact.lastName}\n📱 Phone: ${phone || 'Not provided'}\n🏷️ Type: ${contactType}`,
        success: true,
        data: { contactId: contact.id },
      }
    }
  }

  // ===== NOTE / MEMO =====
  const notePatterns = [
    /^(?:note|memo|jot down|record|save):\s*(.+)$/i,
    /^(?:add|create)\s+(?:a\s+)?(?:note|memo)\s*:?\s*(.+)$/i,
  ]

  for (const pattern of notePatterns) {
    const match = q.match(pattern)
    if (match) {
      const content = match[1].trim()

      await prisma.notification.create({
        data: {
          userId,
          title: 'AI Note',
          message: content,
          type: 'info',
          isRead: false,
        },
      })

      return {
        type: 'note_saved',
        description: `📝 Note saved: "${content}"`,
        success: true,
      }
    }
  }

  // ===== QUICK DATA QUERIES =====
  const howManyMatch = q.match(/^(?:how many|count|what(?:'s|\s+is)\s+(?:my\s+)?(?:total|number\s+of))\s+(.+?)(?:\s+(?:do\s+i\s+have|are\s+there|in\s+total|currently))?\s*$/)
  if (howManyMatch) {
    const target = howManyMatch[1] || ''

    if (target.includes('project')) {
      const count = await prisma.project.count()
      return { type: 'info', description: `📊 You have ${count} project${count !== 1 ? 's' : ''} in total.`, success: true }
    }
    if (target.includes('propert')) {
      const total = await prisma.property.count()
      const available = await prisma.property.count({ where: { status: 'available' } })
      return { type: 'info', description: `🏠 ${total} properties total, ${available} available for sale.`, success: true }
    }
    if (target.includes('contact') || target.includes('client')) {
      const count = await prisma.contact.count()
      return { type: 'info', description: `👤 ${count} contacts in your CRM.`, success: true }
    }
    if (target.includes('invoice')) {
      const total = await prisma.invoice.count()
      const unpaid = await prisma.invoice.count({ where: { status: { not: 'paid' } } })
      return { type: 'info', description: `🧾 ${total} invoices total, ${unpaid} unpaid.`, success: true }
    }
    if (target.includes('employee') || target.includes('staff')) {
      const count = await prisma.employee.count()
      return { type: 'info', description: `👥 ${count} employees on staff.`, success: true }
    }
    if (target.includes('task')) {
      const count = await prisma.projectTask.count()
      return { type: 'info', description: `✅ ${count} tasks in the system.`, success: true }
    }
    if (target.includes('supplier') || target.includes('vendor')) {
      const count = await prisma.supplier.count()
      return { type: 'info', description: `🏭 ${count} suppliers/vendors.`, success: true }
    }
  }

  // Outstanding balance
  if (q.match(/(?:outstanding|owed|receivable|unpaid|balance|due)\s*(?:balance|amount|total|invoices?|money)?$/)) {
    const unpaid = await prisma.invoice.findMany({ where: { status: { not: 'paid' } } })
    const total = unpaid.reduce((sum, inv) => sum + (Number(inv.totalAmount) - Number(inv.paidAmount)), 0)
    return {
      type: 'info',
      description: `💰 Total outstanding: GH₵ ${total.toLocaleString()}\n📋 ${unpaid.length} unpaid invoice${unpaid.length !== 1 ? 's' : ''}`,
      success: true,
    }
  }

  // Revenue
  if (q.match(/(?:revenue|income|total\s+(?:received|earned|collected))/)) {
    const payments = await prisma.payment.aggregate({ _sum: { amount: true }, where: { type: 'received' } })
    const total = Number(payments._sum.amount || 0)
    return {
      type: 'info',
      description: `💰 Total revenue: GH₵ ${total.toLocaleString()}`,
      success: true,
    }
  }

  // Net profit
  if (q.match(/(?:net\s+profit|profit\s+margin|how\s+(?:much|profitable))/)) {
    const payments = await prisma.payment.aggregate({ _sum: { amount: true }, where: { type: 'received' } })
    const expenses = await prisma.transaction.aggregate({ _sum: { totalAmount: true }, where: { type: 'expense' } })
    const revenue = Number(payments._sum.amount || 0)
    const exp = Number(expenses._sum.totalAmount || 0)
    const profit = revenue - exp
    return {
      type: 'info',
      description: `💰 Revenue: GH₵ ${revenue.toLocaleString()}\n💸 Expenses: GH₵ ${exp.toLocaleString()}\n📊 Net Profit: GH₵ ${profit.toLocaleString()}${profit > 0 ? ' ✅' : ' ⚠️'}`,
      success: true,
    }
  }

  // Overdue tasks
  if (q.match(/(?:overdue|late|behind)\s*(?:tasks?|items?)?/)) {
    const now = new Date()
    const overdue = await prisma.projectTask.findMany({
      where: { status: { not: 'completed' }, dueDate: { lt: now } },
      orderBy: { dueDate: 'asc' },
    })
    if (overdue.length === 0) {
      return { type: 'info', description: `✅ No overdue tasks — you're on track!`, success: true }
    }
    const list = overdue.slice(0, 5).map((t) => `  • ${t.title} (due ${new Date(t.dueDate!).toLocaleDateString('en-GB')})`).join('\n')
    return {
      type: 'info',
      description: `⚠️ ${overdue.length} overdue task${overdue.length !== 1 ? 's' : ''}:\n${list}${overdue.length > 5 ? `\n  ...and ${overdue.length - 5} more` : ''}`,
      success: true,
    }
  }

  // Coming up / this week
  if (q.match(/(?:coming up|upcoming|this week|this month|schedule|agenda)/)) {
    const now = new Date()
    const endOfWeek = new Date(now.getTime() + 7 * 86400000)

    const [tasks, events] = await Promise.all([
      prisma.projectTask.findMany({
        where: { status: { not: 'completed' }, dueDate: { gte: now, lte: endOfWeek } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      prisma.appointment.findMany({
        where: { startTime: { gte: now, lte: endOfWeek } },
        orderBy: { startTime: 'asc' },
        take: 5,
      }),
    ])

    let response = `📅 This week:\n`
    if (tasks.length > 0) {
      response += `\n📋 ${tasks.length} task${tasks.length !== 1 ? 's' : ''} due:\n`
      tasks.forEach((t) => { response += `  • ${t.title} — ${new Date(t.dueDate!).toLocaleDateString('en-GB')}\n` })
    }
    if (events.length > 0) {
      response += `\n📆 ${events.length} event${events.length !== 1 ? 's' : ''}:\n`
      events.forEach((e) => { response += `  • ${e.title} — ${new Date(e.startTime).toLocaleDateString('en-GB')}\n` })
    }
    if (tasks.length === 0 && events.length === 0) {
      response += `  Nothing scheduled this week! 🎉`
    }
    return { type: 'info', description: response.trim(), success: true }
  }

  // "what should I focus on today?"
  if (q.match(/(?:what|which)\s+(?:should\s+)?(?:i|we)\s+(?:focus|prioritize|work\s+on)\s+(?:today|this\s+week|now)/)) {
    const now = new Date()
    const endOfWeek = new Date(now.getTime() + 7 * 86400000)

    const [overdueTasks, upcomingTasks, upcomingEvents, unpaidInvoices] = await Promise.all([
      (prisma as any).projectTask.findMany({
        where: { status: { not: 'completed' }, dueDate: { lt: now.toISOString() } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      (prisma as any).projectTask.findMany({
        where: { status: { not: 'completed' }, dueDate: { gte: now.toISOString(), lte: endOfWeek.toISOString() } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      (prisma as any).appointment.findMany({
        where: { startTime: { gte: now.toISOString(), lte: endOfWeek.toISOString() } },
        orderBy: { startTime: 'asc' },
        take: 5,
      }),
      prisma.invoice.findMany({
        where: { status: { not: 'paid' } },
        select: { invoiceNumber: true, totalAmount: true, paidAmount: true, dueDate: true },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ])

    let response = "📋 Here's what needs your attention:\n"

    if (overdueTasks.length > 0) {
      response += `\n🔴 OVERDUE (${overdueTasks.length}):\n`
      overdueTasks.forEach((t: any) => { response += `  • ${t.title}\n` })
    }

    if (upcomingTasks.length > 0) {
      response += `\n🟡 DUE THIS WEEK (${upcomingTasks.length}):\n`
      upcomingTasks.forEach((t: any) => { response += `  • ${t.title} — ${new Date(t.dueDate).toLocaleDateString('en-GB')}\n` })
    }

    if (upcomingEvents.length > 0) {
      response += `\n📅 MEETINGS (${upcomingEvents.length}):\n`
      upcomingEvents.forEach((e: any) => { response += `  • ${e.title} — ${new Date(e.startTime).toLocaleDateString('en-GB')}\n` })
    }

    if (unpaidInvoices.length > 0) {
      const total = unpaidInvoices.reduce((s, i) => s + Number(i.totalAmount) - Number(i.paidAmount), 0)
      response += `\n💰 OUTSTANDING: GH₵${total.toLocaleString()} (${unpaidInvoices.length} invoices)\n`
    }

    if (overdueTasks.length === 0 && upcomingTasks.length === 0 && upcomingEvents.length === 0) {
      response += "  Nothing urgent! You're all caught up. 🎉"
    }

    return { type: 'daily_focus', description: response.trim(), success: true }
  }

  // "which projects are over budget?"
  if (q.match(/(?:which|what)\s+(?:projects?|jobs?)\s+(?:are|is)\s+(?:over\s+budget|behind\s+schedule|at\s+risk)/)) {
    const projects = await prisma.project.findMany({
      select: { name: true, estimatedBudget: true, actualCost: true, status: true, completionPercentage: true },
    })

    const overBudget = projects.filter(p => Number(p.actualCost || 0) > Number(p.estimatedBudget || 0))

    if (overBudget.length === 0) {
      return { type: 'info', description: "✅ All projects are within budget!", success: true }
    }

    let response = `⚠️ ${overBudget.length} project${overBudget.length !== 1 ? 's' : ''} over budget:\n`
    overBudget.forEach(p => {
      const spent = Number(p.actualCost || 0)
      const budget = Number(p.estimatedBudget || 0)
      const pct = Math.round(((spent - budget) / budget) * 100)
      response += `  • ${p.name}: GH₵${spent.toLocaleString()} spent of GH₵${budget.toLocaleString()} (+${pct}%)\n`
    })

    return { type: 'info', description: response.trim(), success: true }
  }

  // "what have I done today?"
  if (q.match(/(?:what\s+have\s+i|what\s+did\s+i|my\s+activity|recent\s+activity|what\s+was\s+done)/)) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [todayTasks, todayEvents, auditLog] = await Promise.all([
      (prisma as any).projectTask.findMany({
        where: { OR: [{ dueDate: { gte: today.toISOString() } }, { completedDate: { gte: today.toISOString() } }] },
        take: 10,
      }),
      (prisma as any).appointment.findMany({
        where: { startTime: { gte: today.toISOString() } },
        take: 10,
      }),
      prisma.auditLog.findMany({
        where: { createdAt: { gte: today } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ])

    let response = "📋 Today's activity:\n"

    if (auditLog.length > 0) {
      response += `\n📝 System events:\n`
      auditLog.forEach((a: any) => { response += `  • ${a.action} — ${a.entityType || ''}\n` })
    }
    if (todayTasks.length > 0) {
      response += `\n✅ Tasks due today:\n`
      todayTasks.forEach((t: any) => { response += `  • ${t.title} (${t.status})\n` })
    }
    if (todayEvents.length > 0) {
      response += `\n📅 Events today:\n`
      todayEvents.forEach((e: any) => { response += `  • ${e.title}\n` })
    }
    if (auditLog.length === 0 && todayTasks.length === 0 && todayEvents.length === 0) {
      response += "  No recorded activity yet today."
    }

    return { type: 'info', description: response.trim(), success: true }
  }

  return null
}
