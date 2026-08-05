(function () {
  'use strict'

  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function num(v) {
    const n = Number(v)
    return isNaN(n) ? 0 : n
  }

  function round2(v) {
    return Math.round((num(v) + Number.EPSILON) * 100) / 100
  }

  function formatCurrency(v) {
    return 'GH₵ ' + num(v).toLocaleString('en-US', { maximumFractionDigits: 2 })
  }

  function formatDate(s) {
    if (!s) return '—'
    const d = new Date(s)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function relativeTime(s) {
    if (!s) return ''
    const t = new Date(s).getTime()
    if (isNaN(t)) return ''
    const diff = Date.now() - t
    const min = Math.floor(diff / 60000)
    if (min < 1) return 'just now'
    if (min < 60) return min + 'm ago'
    const hr = Math.floor(min / 60)
    if (hr < 24) return hr + 'h ago'
    const d = Math.floor(hr / 24)
    if (d < 7) return d + 'd ago'
    return formatDate(s)
  }

  function statusLabel(s) {
    return String(s || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, function (c) { return c.toUpperCase() })
  }

  function badgeClass(status) {
    const s = String(status || '').toLowerCase()
    const map = {
      planning: 'badge-gray',
      in_progress: 'badge-blue',
      on_hold: 'badge-yellow',
      completed: 'badge-green',
      cancelled: 'badge-red',
      overdue: 'badge-red',
      paid: 'badge-green',
      pending: 'badge-yellow',
      draft: 'badge-gray',
      todo: 'badge-gray',
      review: 'badge-blue',
      active: 'badge-green',
      approved: 'badge-green',
      available: 'badge-green',
      delivered: 'badge-green',
      open: 'badge-green',
      sold: 'badge-gray',
      rejected: 'badge-red',
      failed: 'badge-red',
      expired: 'badge-red',
      inactive: 'badge-red',
      customer: 'badge-green',
      lead: 'badge-yellow',
      tenant: 'badge-blue',
      vendor: 'badge-gray',
      contractor: 'badge-blue',
    }
    return map[s] || 'badge-gray'
  }

  function priorityClass(p) {
    const s = String(p || '').toLowerCase()
    if (s === 'high' || s === 'urgent' || s === 'critical') return 'badge-red'
    if (s === 'medium' || s === 'normal') return 'badge-yellow'
    return 'badge-gray'
  }

  function projectTypeLabel(t) {
    return statusLabel(t)
  }

  function paymentMethodLabel(m) {
    const map = {
      cash: 'Cash',
      bank_transfer: 'Bank Transfer',
      cheque: 'Cheque',
      card: 'Card',
      online: 'Online',
      other: 'Other',
    }
    return map[String(m || '')] || statusLabel(m)
  }

  function offlineBanner() {
    return '<div class="offline-banner">📡 Offline — showing last synced data</div>'
  }

  function emptyState(emoji, text) {
    return (
      '<div class="empty-state">' +
      '<div class="empty-emoji">' + emoji + '</div>' +
      '<p class="muted">' + esc(text) + '</p>' +
      '</div>'
    )
  }

  function monthShort(monthKey) {
    const parts = String(monthKey || '').split('-')
    if (parts.length < 2) return esc(monthKey)
    const month = parseInt(parts[1], 10)
    if (isNaN(month) || month < 1 || month > 12) return esc(monthKey)
    return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]
  }

  /* ------------------------------ HOME ------------------------------ */

  function barChart(months) {
    if (!months || !months.length) {
      return '<div class="bars-empty">No revenue data</div>'
    }
    const max = Math.max.apply(null, months.map(function (m) { return num(m.amount) }))
    const bars = months.map(function (m, i) {
      const amt = num(m.amount)
      const h = max > 0 ? Math.max(4, Math.round((amt / max) * 100)) : 4
      const isCurrent = i === months.length - 1
      return (
        '<div class="bar-wrap' + (isCurrent ? ' current' : '') + '">' +
        '<div class="bar" style="height:' + h + '%" title="' + esc(formatCurrency(amt)) + '"></div>' +
        '<span class="bar-label">' + monthShort(m.month) + '</span>' +
        '</div>'
      )
    })
    return '<div class="bars">' + bars.join('') + '</div>'
  }

  function kpiCard(emoji, label, value, extraClass) {
    return (
      '<div class="kpi-card' + (extraClass ? ' ' + extraClass : '') + '">' +
      '<div class="kpi-emoji">' + emoji + '</div>' +
      '<div class="kpi-value">' + value + '</div>' +
      '<div class="kpi-label">' + label + '</div>' +
      '</div>'
    )
  }

  function statusChips(projectStatus) {
    if (!projectStatus || !projectStatus.length) return '<p class="muted small">No project data</p>'
    return (
      '<div class="chips">' +
      projectStatus.map(function (s) {
        return (
          '<span class="chip">' +
          '<span class="badge ' + badgeClass(s.status) + '">' + esc(statusLabel(s.status)) + '</span>' +
          '<b>' + num(s.count) + '</b>' +
          '</span>'
        )
      }).join('') +
      '</div>'
    )
  }

  function activityRow(a) {
    const isPayment = a.type === 'payment'
    const icon = isPayment ? '💵' : '🏗️'
    const title = isPayment
      ? esc(a.title) + ' · ' + formatCurrency(a.amount)
      : esc(a.title)
    return (
      '<li class="feed-item">' +
      '<span class="feed-icon">' + icon + '</span>' +
      '<div class="feed-body">' +
      '<div class="feed-title">' + title + '</div>' +
      (a.status ? '<span class="badge ' + badgeClass(a.status) + '">' + esc(statusLabel(a.status)) + '</span>' : '') +
      '</div>' +
      '<span class="feed-time">' + esc(relativeTime(a.date)) + '</span>' +
      '</li>'
    )
  }

  function taskRow(t) {
    return (
      '<li class="feed-item">' +
      '<span class="feed-icon">📋</span>' +
      '<div class="feed-body">' +
      '<div class="feed-title">' + esc(t.title) + '</div>' +
      '<div class="feed-sub">' + (t.dueDate ? 'Due ' + formatDate(t.dueDate) : 'No due date') + '</div>' +
      '</div>' +
      '<span class="badge ' + priorityClass(t.priority) + '">' + esc(statusLabel(t.priority)) + '</span>' +
      '</li>'
    )
  }

  function quickActions() {
    return (
      '<div class="quick-actions">' +
      '<button class="quick-btn" type="button" data-action="new-project"><span class="quick-icon">🏗️</span>New Project</button>' +
      '<button class="quick-btn" type="button" data-action="new-invoice"><span class="quick-icon">🧾</span>New Invoice</button>' +
      '<button class="quick-btn" type="button" data-action="new-payment"><span class="quick-icon">💵</span>Record Payment</button>' +
      '<button class="quick-btn" type="button" data-action="new-contact"><span class="quick-icon">👥</span>Add Contact</button>' +
      '</div>'
    )
  }

  function renderHome(d) {
    const data = d.dashboard || {}
    const kpi = data.kpi || {}
    const user = d.user || {}
    const activities = (data.recentActivities || []).slice(0, 5)
    const tasks = (data.upcomingTasks || []).slice(0, 5)
    const alerts = d.alerts || []

    const firstName = user.firstName || user.email || ''
    const hour = new Date().getHours()
    let greet = 'Good evening'
    if (hour < 12) greet = 'Good morning'
    else if (hour < 17) greet = 'Good afternoon'
    const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })

    let html = '<div class="screen">'
    if (d.offline) html += offlineBanner()

    html +=
      '<div class="greeting">' +
      '<h2>' + greet + (firstName ? ', ' + esc(firstName) : '') + ' 👋</h2>' +
      '<p>' + today + '</p>' +
      '</div>'

    html +=
      '<div class="kpi-grid">' +
      kpiCard('🏗️', 'Active Projects', num(kpi.activeProjects)) +
      kpiCard('💰', 'Revenue (GHS)', formatCurrency(kpi.revenue), 'kpi-revenue') +
      kpiCard('⚠️', 'Outstanding', formatCurrency(kpi.outstanding), 'kpi-outstanding') +
      kpiCard('🏠', 'Available Properties', num(kpi.availableProperties), 'kpi-properties') +
      '</div>'

    html +=
      '<div class="card-title" style="margin:0 2px 8px;">Quick Actions</div>' +
      quickActions()

    html +=
      '<button class="btn btn-outline" type="button" data-action="view-alerts" style="margin-bottom:14px;">' +
      '<span style="flex:1;text-align:center;">🔔 Alerts <span class="count" style="color:var(--red);">' + alerts.length + '</span> · View all</span>' +
      '</button>'

    html +=
      '<div class="card"><div class="card-title">Project Status</div>' +
      statusChips(data.projectStatus) +
      '</div>'

    html +=
      '<div class="card"><div class="card-title">Monthly Revenue</div>' +
      barChart(data.monthlyRevenue) +
      '</div>'

    html +=
      '<div class="card"><div class="card-title">Recent Activity</div>' +
      (activities.length
        ? '<ul class="feed">' + activities.map(activityRow).join('') + '</ul>'
        : emptyState('🗒️', 'No recent activity')) +
      '</div>'

    html +=
      '<div class="card"><div class="card-title">Upcoming Tasks</div>' +
      (tasks.length
        ? '<ul class="feed">' + tasks.map(taskRow).join('') + '</ul>'
        : emptyState('✅', 'No upcoming tasks')) +
      '</div>'

    html += '</div>'
    return html
  }

  /* ------------------------------ PROJECTS ------------------------------ */

  function projectCard(p) {
    const pct = num(p.completionPercentage)
    const budget = num(p.estimatedBudget)
    return (
      '<article class="project-card" data-id="' + esc(p.id) + '">' +
      '<div class="project-head">' +
      '<h3>' + esc(p.name) + '</h3>' +
      '<span class="badge ' + badgeClass(p.status) + '">' + esc(statusLabel(p.status)) + '</span>' +
      '</div>' +
      '<div class="project-loc">📍 ' + esc(p.location || 'No location') + '</div>' +
      (budget > 0 ? '<div class="project-budget">' + formatCurrency(budget) + '</div>' : '') +
      '<div class="progress"><div class="progress-fill" style="width:' + Math.min(100, pct) + '%"></div></div>' +
      '<div class="project-meta">' +
      '<span>' + pct + '% complete</span>' +
      '<span>' + num(p.taskCount) + ' tasks</span>' +
      '</div>' +
      '</article>'
    )
  }

  function renderProjects(payload, meta) {
    const list = (payload && payload.projects) || []
    let html = '<div class="screen">'
    if (meta && meta.offline) html += offlineBanner()
    html += '<button class="btn btn-primary btn-add" type="button" data-action="new-project">＋ New Project</button>'
    if (!list.length) {
      html += emptyState('🏗️', 'No projects yet')
    } else {
      html +=
        '<div class="card-title" style="margin:0 2px 10px;">' +
        'Projects <span class="count">' + list.length + '</span>' +
        '</div>'
      html += list.map(projectCard).join('')
      if (payload.pagination && payload.pagination.total > list.length) {
        html += '<p class="muted small center">Showing ' + list.length + ' of ' + payload.pagination.total + ' projects</p>'
      }
    }
    html += '</div>'
    return html
  }

  /* ------------------------------ PROJECT DETAIL ------------------------------ */

  function renderProjectDetail(p, meta) {
    const budget = num(p.estimatedBudget)
    const spent = num(p.actualCost)
    const usedPct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0
    const completion = Math.min(100, num(p.completionPercentage))
    const tasks = p.tasks || []
    const budgets = p.budgets || []
    const milestones = p.milestones || []
    const fillClass = usedPct >= 100 ? ' danger' : (usedPct >= 90 ? ' warn' : '')

    let html = '<div class="screen">'
    if (meta && meta.offline) html += offlineBanner()

    html +=
      '<div class="detail-head">' +
      '<h2>' + esc(p.name) + '</h2>' +
      '<span class="badge ' + badgeClass(p.status) + '">' + esc(statusLabel(p.status)) + '</span>' +
      '</div>'

    html += '<button class="btn btn-outline btn-add" type="button" data-action="edit-project" data-id="' + esc(p.id) + '">✏️ Edit Project</button>'

    html +=
      '<div class="meta-grid">' +
      '<div class="meta-cell"><span class="meta-label">📍 Location</span><span class="meta-value">' + esc(p.location || '—') + '</span></div>' +
      '<div class="meta-cell"><span class="meta-label">🏷️ Type</span><span class="meta-value">' + esc(projectTypeLabel(p.projectType)) + '</span></div>' +
      '<div class="meta-cell"><span class="meta-label">📅 Start</span><span class="meta-value">' + formatDate(p.startDate) + '</span></div>' +
      '<div class="meta-cell"><span class="meta-label">📅 End</span><span class="meta-value">' + formatDate(p.endDate) + '</span></div>' +
      '</div>'

    html +=
      '<div class="card">' +
      '<div class="card-title">Budget vs Spent</div>' +
      '<div class="kpi-inline">' +
      '<div><span class="kpi-inline-label">Budget</span><b>' + formatCurrency(budget) + '</b></div>' +
      '<div><span class="kpi-inline-label">Spent</span><b>' + formatCurrency(spent) + '</b></div>' +
      '<div><span class="kpi-inline-label">Used</span><b>' + usedPct + '%</b></div>' +
      '</div>' +
      '<div class="progress"><div class="progress-fill' + fillClass + '" style="width:' + usedPct + '%"></div></div>' +
      '</div>'

    html +=
      '<div class="card">' +
      '<div class="card-title">Progress</div>' +
      '<div class="progress"><div class="progress-fill" style="width:' + completion + '%"></div></div>' +
      '<div class="center-text">' + completion + '% complete</div>' +
      '</div>'

    if (p.description) {
      html += '<div class="card"><div class="card-title">Description</div><p class="muted">' + esc(p.description) + '</p></div>'
    }

    html +=
      '<div class="card">' +
      '<div class="section-head">' +
      '<div class="card-title" style="margin:0;">📋 Tasks <span class="count">' + tasks.length + '</span></div>' +
      '<button class="btn-sm btn-sm-green" type="button" data-action="add-task" data-id="' + esc(p.id) + '">＋ Add Task</button>' +
      '</div>' +
      (tasks.length
        ? '<ul class="mini-list">' + tasks.map(function (t) {
            const isDone = String(t.status).toLowerCase() === 'completed'
            return (
              '<li class="task-row' + (isDone ? ' task-done' : '') + '">' +
              '<div class="task-main">' +
              '<div class="task-title">' + esc(t.title) + '</div>' +
              '<div class="task-sub">' +
              (t.description ? esc(t.description) + ' · ' : '') +
              (t.dueDate ? 'Due ' + formatDate(t.dueDate) : 'No due date') +
              '</div>' +
              '</div>' +
              '<span class="badge ' + priorityClass(t.priority) + '">' + esc(statusLabel(t.priority)) + '</span>' +
              (isDone
                ? '<span class="badge badge-green">Completed</span>'
                : '<button class="btn-sm btn-sm-green" type="button" data-action="task-complete" data-id="' + esc(t.id) + '">✓ Done</button>') +
              '</li>'
            )
          }).join('') + '</ul>'
        : emptyState('🗒️', 'No tasks yet — add the first one')) +
      '</div>'

    if (budgets.length) {
      html +=
        '<div class="card"><div class="card-title">💰 Budgets</div>' +
        budgets.map(function (b) {
          const bd = num(b.budgetedAmount)
          const sp = num(b.spentAmount)
          const pct = bd > 0 ? Math.min(100, Math.round((sp / bd) * 100)) : 0
          const cls = pct >= 100 ? ' danger' : (pct >= 90 ? ' warn' : '')
          return (
            '<div class="budget-row">' +
            '<div class="budget-head"><span>' + esc(b.category) + '</span><span>' + formatCurrency(sp) + ' / ' + formatCurrency(bd) + '</span></div>' +
            '<div class="progress"><div class="progress-fill' + cls + '" style="width:' + pct + '%"></div></div>' +
            '</div>'
          )
        }).join('') +
        '</div>'
    }

    if (milestones.length) {
      html +=
        '<div class="card"><div class="card-title">🎯 Milestones <span class="count">' + milestones.length + '</span></div>' +
        '<ul class="mini-list">' +
        milestones.map(function (m) {
          return (
            '<li class="mini-row">' +
            '<div style="flex:1;min-width:0;">' +
            '<div class="mini-title">' + esc(m.name) + '</div>' +
            '<div class="mini-sub">' + (m.dueDate ? 'Due ' + formatDate(m.dueDate) : '') + '</div>' +
            '</div>' +
            '<span class="badge ' + badgeClass(m.status) + '">' + esc(statusLabel(m.status)) + '</span>' +
            '</li>'
          )
        }).join('') +
        '</ul></div>'
    }

    html += '</div>'
    return html
  }

  /* ------------------------------ FINANCE ------------------------------ */

  function invoiceRow(inv) {
    const remaining = num(inv.totalAmount) - num(inv.paidAmount)
    return (
      '<li class="invoice-row">' +
      '<div class="invoice-main">' +
      '<span class="invoice-num">' + esc(inv.invoiceNumber) + '</span>' +
      '<span class="badge ' + badgeClass(inv.status) + '">' + esc(statusLabel(inv.status)) + '</span>' +
      '</div>' +
      '<div class="invoice-client">👤 ' + esc(inv.contactName || 'Unknown') + '</div>' +
      '<div class="invoice-foot">' +
      '<span class="invoice-date">Due ' + formatDate(inv.dueDate) + '</span>' +
      '<span class="invoice-amt">' + formatCurrency(remaining) + '</span>' +
      '</div>' +
      '</li>'
    )
  }

  function paymentRow(pay) {
    const made = String(pay.type).toLowerCase() === 'made'
    const icon = made ? '🧾' : '💵'
    const sign = made ? '−' : '+'
    const sub = paymentMethodLabel(pay.paymentMethod) + (pay.contactName && pay.contactName !== 'Unknown' ? ' · ' + pay.contactName : '')
    return (
      '<li class="payment-row">' +
      '<span class="pay-icon' + (made ? ' made' : '') + '">' + icon + '</span>' +
      '<div class="pay-main">' +
      '<div class="pay-title">' + esc(pay.paymentNumber) + '</div>' +
      '<div class="pay-sub">' + esc(sub) + '</div>' +
      '</div>' +
      '<div class="pay-right">' +
      '<div class="pay-amt' + (made ? ' made' : '') + '">' + sign + formatCurrency(pay.amount) + '</div>' +
      '<div class="pay-date">' + formatDate(pay.paymentDate) + '</div>' +
      '</div>' +
      '</li>'
    )
  }

  function renderFinance(f, meta) {
    const invoices = (f && f.invoices) || []
    const payments = (f && f.payments) || []
    const outstanding = invoices.filter(function (inv) {
      return String(inv.status).toLowerCase() !== 'paid'
    })
    const outstandingTotal = outstanding.reduce(function (acc, inv) {
      return acc + (num(inv.totalAmount) - num(inv.paidAmount))
    }, 0)

    let html = '<div class="screen">'
    if (meta && meta.offline) html += offlineBanner()

    html +=
      '<button class="btn btn-primary btn-add" type="button" data-action="new-invoice">＋ New Invoice</button>' +
      '<button class="btn btn-outline btn-add" type="button" data-action="new-payment">＋ Record Payment</button>'

    html +=
      '<div class="card summary-card">' +
      '<div class="summary-item"><span class="summary-label">Outstanding</span><span class="summary-value negative">' + formatCurrency(outstandingTotal) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Invoices</span><span class="summary-value">' + invoices.length + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Payments</span><span class="summary-value positive">' + payments.length + '</span></div>' +
      '</div>'

    html +=
      '<div class="card">' +
      '<div class="card-title">Outstanding Invoices <span class="count">' + outstanding.length + '</span></div>' +
      (outstanding.length
        ? '<ul>' + outstanding.map(invoiceRow).join('') + '</ul>'
        : emptyState('🎉', 'No outstanding invoices')) +
      '</div>'

    html +=
      '<div class="card">' +
      '<div class="card-title">Recent Payments</div>' +
      (payments.length
        ? '<ul>' + payments.slice(0, 20).map(paymentRow).join('') + '</ul>'
        : emptyState('💳', 'No payments recorded')) +
      '</div>'

    html += '</div>'
    return html
  }

  /* ------------------------------ CONTACTS ------------------------------ */

  function initials(c) {
    return esc(((c.firstName || '')[0] || '') + ((c.lastName || '')[0] || ''))
  }

  function contactCard(c) {
    const type = c.type || 'customer'
    const sub = [c.email, c.phone, c.company].filter(Boolean).map(esc).join(' · ')
    return (
      '<article class="contact-card">' +
      '<div class="contact-head">' +
      '<div class="contact-avatar">' + initials(c) + '</div>' +
      '<div class="contact-main">' +
      '<div class="contact-name">' + esc(c.firstName || '') + ' ' + esc(c.lastName || '') + '</div>' +
      '<div class="contact-sub">' + (sub || 'No contact details') + '</div>' +
      '</div>' +
      '<span class="badge ' + badgeClass(type) + '">' + esc(statusLabel(type)) + '</span>' +
      '</div>' +
      '<div class="contact-actions">' +
      (c.email ? '<a class="btn-sm" href="mailto:' + esc(c.email) + '">✉️ Email</a>' : '') +
      (c.phone ? '<a class="btn-sm" href="tel:' + esc(c.phone) + '">📞 Call</a>' : '') +
      '<button class="btn-sm" type="button" data-action="edit-contact" data-id="' + esc(c.id) + '">✏️ Edit</button>' +
      '<button class="btn-sm btn-sm-danger" type="button" data-action="delete-contact" data-id="' + esc(c.id) + '">🗑️ Delete</button>' +
      '</div>' +
      '</article>'
    )
  }

  function renderContacts(contacts, meta) {
    const list = Array.isArray(contacts) ? contacts : []
    let html = '<div class="screen">'
    if (meta && meta.offline) html += offlineBanner()
    html += '<button class="btn btn-primary btn-add" type="button" data-action="new-contact">＋ Add Contact</button>'
    if (!list.length) {
      html += emptyState('👥', 'No contacts yet')
    } else {
      html +=
        '<div class="card-title" style="margin:0 2px 10px;">' +
        'Contacts <span class="count">' + list.length + '</span>' +
        '</div>'
      html += list.map(contactCard).join('')
    }
    html += '</div>'
    return html
  }

  /* ------------------------------ ALERTS ------------------------------ */

  function alertCard(a) {
    return (
      '<article class="alert-card alert-' + a.severity + '">' +
      '<span class="alert-icon">' + a.icon + '</span>' +
      '<div><div class="alert-title">' + esc(a.title) + '</div><div class="alert-detail">' + esc(a.detail) + '</div></div>' +
      '</article>'
    )
  }

  function renderAlerts(alerts) {
    let html = '<div class="screen">'
    if (!alerts.length) {
      html += emptyState('🎉', 'All clear — no alerts right now.')
    } else {
      html += '<div class="card-title" style="margin:0 2px 10px;">Alerts <span class="count">' + alerts.length + '</span></div>'
      html += alerts.map(alertCard).join('')
    }
    html += '</div>'
    return html
  }

  /* ------------------------------ SETTINGS ------------------------------ */

  function renderSettings(s) {
    const user = s.user || {}
    const role = (user.role && user.role.name) || 'Staff'
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ')
    return (
      '<div class="screen">' +
      '<div class="card">' +
      '<div class="card-title">👤 Account</div>' +
      '<div class="settings-row"><span>Name</span><b>' + esc(fullName || '—') + '</b></div>' +
      '<div class="settings-row"><span>Email</span><b>' + esc(user.email || '—') + '</b></div>' +
      '<div class="settings-row"><span>Role</span><b>' + esc(role) + '</b></div>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-title">📲 Pairing</div>' +
      '<button class="btn btn-outline" type="button" data-action="link-qr">📷 Link with QR</button>' +
      '</div>' +

      '<div class="card">' +
      '<div class="card-title">🌐 Server</div>' +
      '<div class="settings-row"><span>Address</span><b>' + esc(s.serverUrl || '—') + '</b></div>' +
      '<button class="btn btn-outline" type="button" data-action="change-server">Change Server</button>' +
      '</div>' +

      '<div class="card center">' +
      '<div style="font-size:26px;">🏗️</div>' +
      '<div style="font-weight:700;margin-top:6px;">BuildProp Admin v2.0.0</div>' +
      '<div class="muted small" style="margin-top:4px;">BuildProp ERP · mobile admin</div>' +
      '</div>' +

      '<button class="btn btn-danger" type="button" data-action="sign-out">Sign Out</button>' +
      '</div>'
    )
  }

  /* ------------------------------ FORMS ------------------------------ */

  var PROJECT_TYPES = ['residential', 'commercial', 'industrial', 'infrastructure', 'mixed_use']
  var PROJECT_STATUSES = ['planning', 'in_progress', 'on_hold', 'completed', 'cancelled']
  var PRIORITIES = ['low', 'medium', 'high', 'critical']
  var CONTACT_TYPES = ['customer', 'lead', 'tenant', 'vendor', 'contractor']
  var INVOICE_TYPES = ['sales', 'purchase', 'proforma', 'credit_note']
  var PAYMENT_METHODS = ['cash', 'bank_transfer', 'cheque', 'card', 'online', 'other']
  var CONTACT_SOURCES = ['website', 'referral', 'walk_in', 'social', 'phone', 'email', 'other']
  var LEAD_STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost']

  function optionsHtml(list, selected) {
    return list.map(function (o) {
      return '<option value="' + esc(o) + '"' + (String(o) === String(selected) ? ' selected' : '') + '>' + esc(statusLabel(o)) + '</option>'
    }).join('')
  }

  function formLabel(label, required) {
    return '<label class="form-label">' + esc(label) + (required ? ' <span class="req">*</span>' : '') + '</label>'
  }

  function dateValue(s) {
    if (!s) return ''
    const v = String(s)
    if (v.length <= 10) return v
    return v.slice(0, 10)
  }

  function toDateInput(daysFromNow) {
    const d = new Date()
    d.setDate(d.getDate() + daysFromNow)
    return d.toISOString().slice(0, 10)
  }

  function formButtons() {
    return (
      '<div class="form-buttons">' +
      '<button class="btn btn-outline" type="button" data-action="close-modal">Cancel</button>' +
      '<button class="btn btn-primary" type="submit">Save</button>' +
      '</div>'
    )
  }

  function contactOptions(contacts) {
    let html = '<option value="">— Auto (first contact) —</option>'
    html += (contacts || []).map(function (c) {
      const name = [c.firstName, c.lastName].filter(Boolean).join(' ')
      return '<option value="' + esc(c.id) + '">' + esc(name || 'Contact') + '</option>'
    }).join('')
    return html
  }

  function generateProjectCode(name) {
    const slug = String(name || '')
      .replace(/[^a-zA-Z0-9]+/g, '')
      .slice(0, 4)
      .toUpperCase()
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
    return (slug ? 'PRJ-' + slug + '-' : 'PRJ-') + rand
  }

  function renderProjectForm(p) {
    p = p || {}
    const isEdit = !!p.id
    const val = function (k) { return p[k] === undefined || p[k] === null ? '' : p[k] }
    return (
      '<form data-form="project" data-id="' + esc(p.id || '') + '">' +
      formLabel('Project name', true) +
      '<input id="f-name" class="form-input" value="' + esc(val('name')) + '" maxlength="200" placeholder="e.g. Sunrise Villas Phase 2">' +

      formLabel('Project code', true) +
      '<input id="f-code" class="form-input" value="' + esc(isEdit ? val('code') : generateProjectCode(val('name'))) + '" maxlength="50" placeholder="e.g. PRJ-2026-001">' +

      formLabel('Location') +
      '<input id="f-location" class="form-input" value="' + esc(val('location')) + '" maxlength="500" placeholder="e.g. East Legon, Accra">' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Type') + '<select id="f-type" class="form-select">' + optionsHtml(PROJECT_TYPES, val('projectType') || 'residential') + '</select></div>' +
      '<div>' + formLabel('Status') + '<select id="f-status" class="form-select">' + optionsHtml(PROJECT_STATUSES, val('status') || 'planning') + '</select></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Priority') + '<select id="f-priority" class="form-select">' + optionsHtml(PRIORITIES, val('priority') || 'medium') + '</select></div>' +
      '<div>' + formLabel('Estimated budget') + '<input id="f-budget" class="form-input" type="number" min="0" step="0.01" value="' + esc(val('estimatedBudget')) + '" placeholder="0.00"></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Start date') + '<input id="f-start" class="form-input" type="date" value="' + esc(dateValue(val('startDate'))) + '"></div>' +
      '<div>' + formLabel('End date') + '<input id="f-end" class="form-input" type="date" value="' + esc(dateValue(val('endDate'))) + '"></div>' +
      '</div>' +

      formLabel('Description') +
      '<textarea id="f-description" class="form-textarea" maxlength="2000" placeholder="Brief project description">' + esc(val('description')) + '</textarea>' +

      formButtons() +
      '</form>'
    )
  }

  function invoiceItemRowHtml(index) {
    return (
      '<div class="inv-item">' +
      '<input class="form-input f-item-desc" placeholder="Description — e.g. Foundation works" maxlength="500">' +
      '<div class="inv-item-cols">' +
      '<input class="form-input f-item-qty" type="number" min="1" step="1" value="1">' +
      '<input class="form-input f-item-price" type="number" min="0" step="0.01" placeholder="Unit price (GH₵)">' +
      '<button class="btn-sm btn-sm-danger remove-item" type="button" data-action="remove-item">✕</button>' +
      '</div>' +
      '</div>'
    )
  }

  function renderInvoiceForm(contacts) {
    return (
      '<form data-form="invoice">' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Invoice type') + '<select id="f-inv-type" class="form-select">' + optionsHtml(INVOICE_TYPES, 'sales') + '</select></div>' +
      '<div>' + formLabel('Customer') + '<select id="f-inv-customer" class="form-select">' + contactOptions(contacts) + '</select></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Issue date', true) + '<input id="f-inv-issue" class="form-input" type="date" value="' + toDateInput(0) + '"></div>' +
      '<div>' + formLabel('Due date', true) + '<input id="f-inv-due" class="form-input" type="date" value="' + toDateInput(14) + '"></div>' +
      '</div>' +

      formLabel('Line items') +
      '<div class="inv-items">' + invoiceItemRowHtml(0) + '</div>' +
      '<button class="btn-sm" type="button" data-action="add-item">＋ Add item</button>' +

      '<div id="inv-totals" class="inv-totals"></div>' +
      '<div class="form-hint">VAT of 15% is applied to the subtotal, matching the desktop invoice.</div>' +

      formButtons() +
      '</form>'
    )
  }

  function renderPaymentForm(contacts, invoices) {
    let invOptions = '<option value="">— None —</option>'
    invOptions += (invoices || []).map(function (inv) {
      const remaining = round2(num(inv.totalAmount) - num(inv.paidAmount))
      const label = inv.invoiceNumber + ' — ' + formatCurrency(remaining) + (String(inv.status).toLowerCase() === 'paid' ? ' (paid)' : ' (' + statusLabel(inv.status) + ')')
      return '<option value="' + esc(inv.id) + '">' + esc(label) + '</option>'
    }).join('')
    return (
      '<form data-form="payment">' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Type') + '<select id="f-pay-type" class="form-select">' + optionsHtml(['received', 'made'], 'received') + '</select></div>' +
      '<div>' + formLabel('Payment method') + '<select id="f-pay-method" class="form-select">' + optionsHtml(PAYMENT_METHODS, 'cash') + '</select></div>' +
      '</div>' +

      formLabel('Customer') +
      '<select id="f-pay-customer" class="form-select">' + contactOptions(contacts) + '</select>' +

      formLabel('Amount', true) +
      '<input id="f-pay-amount" class="form-input" type="number" min="0" step="0.01" placeholder="0.00">' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Payment date', true) + '<input id="f-pay-date" class="form-input" type="date" value="' + toDateInput(0) + '"></div>' +
      '<div>' + formLabel('Invoice') + '<select id="f-pay-invoice" class="form-select">' + invOptions + '</select></div>' +
      '</div>' +

      formButtons() +
      '</form>'
    )
  }

  function renderContactForm(c) {
    c = c || {}
    const val = function (k) { return c[k] === undefined || c[k] === null ? '' : c[k] }
    return (
      '<form data-form="contact" data-id="' + esc(c.id || '') + '">' +

      formLabel('Type') +
      '<select id="f-contact-type" class="form-select">' + optionsHtml(CONTACT_TYPES, val('type') || 'customer') + '</select>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('First name', true) + '<input id="f-first" class="form-input" value="' + esc(val('firstName')) + '" maxlength="100"></div>' +
      '<div>' + formLabel('Last name', true) + '<input id="f-last" class="form-input" value="' + esc(val('lastName')) + '" maxlength="100"></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Email') + '<input id="f-email" class="form-input" type="email" value="' + esc(val('email')) + '"></div>' +
      '<div>' + formLabel('Phone') + '<input id="f-phone" class="form-input" type="tel" value="' + esc(val('phone')) + '" maxlength="20"></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Company') + '<input id="f-company" class="form-input" value="' + esc(val('company')) + '" maxlength="200"></div>' +
      '<div>' + formLabel('Source') + '<select id="f-source" class="form-select">' + optionsHtml(CONTACT_SOURCES, val('source') || 'website') + '</select></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Lead status') + '<select id="f-lead-status" class="form-select">' + optionsHtml(LEAD_STATUSES, val('leadStatus') || 'new') + '</select></div>' +
      '<div>' + formLabel('Address') + '<input id="f-address" class="form-input" value="' + esc(val('address')) + '" maxlength="500"></div>' +
      '</div>' +

      formLabel('Notes') +
      '<textarea id="f-notes" class="form-textarea" maxlength="2000" placeholder="Notes about this contact">' + esc(val('notes')) + '</textarea>' +

      formButtons() +
      '</form>'
    )
  }

  function renderTaskForm(projectId) {
    return (
      '<form data-form="task" data-project-id="' + esc(projectId) + '">' +
      formLabel('Task title', true) +
      '<input id="f-task-title" class="form-input" maxlength="300" placeholder="e.g. Order site materials">' +

      formLabel('Description') +
      '<textarea id="f-task-desc" class="form-textarea" maxlength="2000" placeholder="What needs to be done"></textarea>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Priority') + '<select id="f-task-priority" class="form-select">' + optionsHtml(PRIORITIES, 'medium') + '</select></div>' +
      '<div>' + formLabel('Due date') + '<input id="f-task-due" class="form-input" type="date"></div>' +
      '</div>' +

      formButtons() +
      '</form>'
    )
  }

  window.BuildPropScreens = {
    esc: esc,
    num: num,
    round2: round2,
    formatCurrency: formatCurrency,
    formatDate: formatDate,
    relativeTime: relativeTime,
    statusLabel: statusLabel,
    badgeClass: badgeClass,
    renderHome: renderHome,
    renderProjects: renderProjects,
    renderProjectDetail: renderProjectDetail,
    renderFinance: renderFinance,
    renderContacts: renderContacts,
    renderAlerts: renderAlerts,
    renderSettings: renderSettings,
    renderProjectForm: renderProjectForm,
    renderInvoiceForm: renderInvoiceForm,
    renderPaymentForm: renderPaymentForm,
    renderContactForm: renderContactForm,
    renderTaskForm: renderTaskForm,
    invoiceItemRowHtml: invoiceItemRowHtml,
  }
})()
