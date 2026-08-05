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
      rented: 'badge-blue',
      under_maintenance: 'badge-yellow',
      maintenance: 'badge-yellow',
      received: 'badge-green',
      retired: 'badge-gray',
      disposed: 'badge-gray',
      on_notice: 'badge-yellow',
      terminated: 'badge-red',
      defaulted: 'badge-red',
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
      '<div class="card-title" style="margin:0 2px 8px;">Modules</div>' +
      '<div class="quick-links">' +
      '<button class="quick-btn" type="button" data-action="open-module" data-module="properties"><span class="quick-icon">🏠</span>Properties</button>' +
      '<button class="quick-btn" type="button" data-action="open-module" data-module="inventory"><span class="quick-icon">📦</span>Inventory</button>' +
      '<button class="quick-btn" type="button" data-action="open-module" data-module="employees"><span class="quick-icon">👷</span>Employees</button>' +
      '<button class="quick-btn" type="button" data-action="open-module" data-module="reports"><span class="quick-icon">📊</span>Reports</button>' +
      '</div>'

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

  /* ------------------------------ MORE TAB ------------------------------ */

  var MORE_MODULES = [
    { key: 'properties', emoji: '🏠', label: 'Properties', sub: 'Listings & units' },
    { key: 'inventory', emoji: '📦', label: 'Inventory', sub: 'Materials & stock' },
    { key: 'procurement', emoji: '📋', label: 'Procurement', sub: 'Purchase orders' },
    { key: 'fleet', emoji: '🚚', label: 'Fleet', sub: 'Vehicles' },
    { key: 'equipment', emoji: '🛠️', label: 'Equipment', sub: 'Desktop only' },
    { key: 'assets', emoji: '💎', label: 'Assets', sub: 'Company assets' },
    { key: 'employees', emoji: '👷', label: 'Employees', sub: 'Staff & HR' },
    { key: 'installments', emoji: '📅', label: 'Installments', sub: 'Payment plans' },
    { key: 'reports', emoji: '📊', label: 'Reports', sub: 'Analytics & P&L' },
  ]

  function renderMore() {
    let html = '<div class="screen">'
    html += '<div class="card-title" style="margin:0 2px 10px;">Modules</div>'
    html += '<div class="module-grid">'
    html += MORE_MODULES.map(function (m) {
      return (
        '<button class="module-card" type="button" data-action="open-module" data-module="' + esc(m.key) + '">' +
        '<span class="module-emoji">' + m.emoji + '</span>' +
        '<span class="module-label">' + esc(m.label) + '</span>' +
        '<span class="module-sub">' + esc(m.sub) + '</span>' +
        '</button>'
      )
    }).join('')
    html +=
      '<button class="module-card" type="button" data-action="open-alerts">' +
      '<span class="module-emoji">🔔</span>' +
      '<span class="module-label">Alerts</span>' +
      '<span class="module-sub">Overdue & warnings</span>' +
      '</button>'
    html +=
      '<button class="module-card" type="button" data-action="open-settings">' +
      '<span class="module-emoji">⚙️</span>' +
      '<span class="module-label">Settings</span>' +
      '<span class="module-sub">Account & pairing</span>' +
      '</button>'
    html += '</div>'
    html += '</div>'
    return html
  }

  function renderModuleUnavailable(module) {
    const title = statusLabel(module)
    return (
      '<div class="screen">' +
      '<div class="card">' +
      '<div class="card-title">' + esc(title) + '</div>' +
      '<div style="font-size:40px;text-align:center;margin:14px 0;">🛠️</div>' +
      '<p class="muted center" style="line-height:1.5;">' + esc(title) + ' is not available in the mobile app yet.<br><b>Available on the desktop</b>.</p>' +
      '</div>' +
      '</div>'
    )
  }

  /* ------------------------------ MODULE LIST SCREENS ------------------------------ */

  function modulePage(opts) {
    let html = '<div class="screen">'
    if (opts.offline) html += offlineBanner()
    if (opts.addHtml) html += opts.addHtml
    if (opts.countHtml) html += opts.countHtml
    html += opts.body
    html += '</div>'
    return html
  }

  function itemActions(actions) {
    return (
      '<div class="item-actions">' +
      actions.map(function (a) {
        const cls = a.danger ? ' btn-sm-danger' : (a.green ? ' btn-sm-green' : '')
        return '<button class="btn-sm' + cls + '" type="button" data-action="' + esc(a.action) + '" data-id="' + esc(a.id) + '">' + a.label + '</button>'
      }).join('') +
      '</div>'
    )
  }

  /* ---------- Properties ---------- */

  function propertyCard(p) {
    return (
      '<div class="item-card">' +
      '<div class="item-main">' +
      '<div class="item-title">' + esc(p.name) + '</div>' +
      '<div class="item-sub">' +
      (p.address || p.city ? esc([p.address, p.city].filter(Boolean).join(', ')) + '<br>' : '') +
      '<span class="item-badges">' +
      '<span class="badge ' + badgeClass(p.propertyType) + '">' + esc(statusLabel(p.propertyType)) + '</span>' +
      '<span class="badge ' + badgeClass(p.status) + '">' + esc(statusLabel(p.status)) + '</span>' +
      '</span>' +
      '</div>' +
      '<div class="item-value">' + formatCurrency(p.price) + '</div>' +
      '</div>' +
      itemActions([
        { action: 'edit-property', id: p.id, label: '✏️ Edit' },
        { action: 'delete-property', id: p.id, label: '🗑️', danger: true },
      ]) +
      '</div>'
    )
  }

  function renderProperties(list, meta) {
    list = Array.isArray(list) ? list : []
    return modulePage({
      offline: meta && meta.offline,
      addHtml: '<button class="btn btn-primary btn-add" type="button" data-action="new-property">＋ Add Property</button>',
      countHtml: '<div class="card-title" style="margin:0 2px 10px;">Properties <span class="count">' + list.length + '</span></div>',
      body: list.length ? list.map(propertyCard).join('') : emptyState('🏠', 'No properties yet'),
    })
  }

  /* ---------- Inventory ---------- */

  function inventoryCard(i) {
    const cat = (i.category && i.category.name) || 'Uncategorised'
    const low = num(i.minStock)
    const stock = num(i.currentStock)
    return (
      '<div class="item-card">' +
      '<div class="item-main">' +
      '<div class="item-title">' + esc(i.name) + '</div>' +
      '<div class="item-sub">' +
      esc(cat) + ' · SKU ' + esc(i.sku || '—') +
      (low > 0 && stock <= low ? '<br><span class="badge badge-red">Low stock</span>' : '') +
      '</div>' +
      '<div class="item-value">' + num(i.currentStock).toLocaleString() + ' ' + esc(i.unitOfMeasure || '') +
      (low > 0 ? ' <span class="muted small">reorder at ' + low + '</span>' : '') +
      '</div>' +
      '</div>' +
      itemActions([
        { action: 'adjust-inventory', id: i.id, label: '⇅ Adjust', green: true },
        { action: 'edit-inventory', id: i.id, label: '✏️' },
        { action: 'delete-inventory', id: i.id, label: '🗑️', danger: true },
      ]) +
      '</div>'
    )
  }

  function renderInventory(list, meta) {
    list = Array.isArray(list) ? list : []
    return modulePage({
      offline: meta && meta.offline,
      addHtml: '<button class="btn btn-primary btn-add" type="button" data-action="new-inventory">＋ Add Inventory Item</button>',
      countHtml: '<div class="card-title" style="margin:0 2px 10px;">Inventory <span class="count">' + list.length + '</span></div>',
      body: list.length ? list.map(inventoryCard).join('') : emptyState('📦', 'No inventory items yet'),
    })
  }

  /* ---------- Procurement ---------- */

  function procurementCard(po) {
    return (
      '<div class="item-card">' +
      '<div class="item-main">' +
      '<div class="item-title">' + esc(po.poNumber || 'PO') + ' · ' + esc(po.supplierName || 'Unknown') + '</div>' +
      '<div class="item-sub">' +
      (po.orderDate ? 'Ordered ' + formatDate(po.orderDate) + ' · ' : '') +
      num(po.itemCount) + ' line item' + (num(po.itemCount) === 1 ? '' : 's') +
      '</div>' +
      '<div class="item-value">' + formatCurrency(po.totalAmount) +
      ' <span class="badge ' + badgeClass(po.status) + '">' + esc(statusLabel(po.status)) + '</span>' +
      '</div>' +
      '</div>' +
      itemActions([
        { action: 'view-procurement', id: po.id, label: '👁️ View' },
        { action: 'edit-procurement', id: po.id, label: '✏️' },
        { action: 'delete-procurement', id: po.id, label: '🗑️', danger: true },
      ]) +
      '</div>'
    )
  }

  function renderProcurement(payload, meta) {
    const pos = (payload && payload.purchaseOrders) || []
    return modulePage({
      offline: meta && meta.offline,
      addHtml: '<button class="btn btn-primary btn-add" type="button" data-action="new-procurement">＋ New Purchase Order</button>',
      countHtml: '<div class="card-title" style="margin:0 2px 10px;">Purchase Orders <span class="count">' + pos.length + '</span></div>',
      body: pos.length ? pos.map(procurementCard).join('') : emptyState('📋', 'No purchase orders yet'),
    })
  }

  /* ---------- Fleet ---------- */

  function fleetCard(v) {
    const meta = [v.make, v.model, v.year].filter(Boolean).join(' ')
    return (
      '<div class="item-card">' +
      '<div class="item-main">' +
      '<div class="item-title">' + esc(v.name) + ' <span class="muted">·</span> ' + esc(v.licensePlate) + '</div>' +
      '<div class="item-sub">' +
      (meta ? esc(meta) + ' · ' : '') +
      num(v.mileage).toLocaleString() + ' km' +
      '</div>' +
      '<div class="item-value"><span class="badge ' + badgeClass(v.status) + '">' + esc(statusLabel(v.status)) + '</span></div>' +
      '</div>' +
      itemActions([
        { action: 'edit-fleet', id: v.id, label: '✏️ Edit' },
        { action: 'delete-fleet', id: v.id, label: '🗑️', danger: true },
      ]) +
      '</div>'
    )
  }

  function renderFleet(list, meta) {
    list = Array.isArray(list) ? list : []
    return modulePage({
      offline: meta && meta.offline,
      addHtml: '<button class="btn btn-primary btn-add" type="button" data-action="new-fleet">＋ Add Vehicle</button>',
      countHtml: '<div class="card-title" style="margin:0 2px 10px;">Fleet <span class="count">' + list.length + '</span></div>',
      body: list.length ? list.map(fleetCard).join('') : emptyState('🚚', 'No vehicles yet'),
    })
  }

  /* ---------- Assets ---------- */

  function assetCard(a) {
    return (
      '<div class="item-card">' +
      '<div class="item-main">' +
      '<div class="item-title">' + esc(a.name) + '</div>' +
      '<div class="item-sub">' +
      esc(a.assetCode || '') + (a.category ? ' · ' + esc(a.category) : '') +
      (a.location ? '<br>📍 ' + esc(a.location) : '') +
      '</div>' +
      '<div class="item-value">' + formatCurrency(a.currentValue) +
      ' <span class="badge ' + badgeClass(a.status) + '">' + esc(statusLabel(a.status)) + '</span>' +
      '</div>' +
      '</div>' +
      itemActions([
        { action: 'edit-asset', id: a.id, label: '✏️ Edit' },
        { action: 'delete-asset', id: a.id, label: '🗑️', danger: true },
      ]) +
      '</div>'
    )
  }

  function renderAssets(list, meta) {
    list = Array.isArray(list) ? list : []
    return modulePage({
      offline: meta && meta.offline,
      addHtml: '<button class="btn btn-primary btn-add" type="button" data-action="new-asset">＋ Add Asset</button>',
      countHtml: '<div class="card-title" style="margin:0 2px 10px;">Assets <span class="count">' + list.length + '</span></div>',
      body: list.length ? list.map(assetCard).join('') : emptyState('💎', 'No assets yet'),
    })
  }

  /* ---------- Employees / HR ---------- */

  function employeeCard(e) {
    return (
      '<div class="item-card">' +
      '<div class="item-main">' +
      '<div class="item-title">' + esc(e.designation || e.employeeId || 'Employee') + '</div>' +
      '<div class="item-sub">' +
      (e.employeeId ? esc(e.employeeId) + ' · ' : '') +
      esc(e.departmentName || 'No department') +
      '</div>' +
      '<div class="item-value">' + formatCurrency(e.salary) +
      ' <span class="badge ' + badgeClass(e.status) + '">' + esc(statusLabel(e.status)) + '</span>' +
      '</div>' +
      '</div>' +
      itemActions([
        { action: 'edit-employee', id: e.id, label: '✏️ Edit' },
        { action: 'delete-employee', id: e.id, label: '🗑️', danger: true },
      ]) +
      '</div>'
    )
  }

  function renderEmployees(payload, meta) {
    const employees = (payload && payload.employees) || []
    const departments = (payload && payload.departments) || []
    return modulePage({
      offline: meta && meta.offline,
      addHtml: '<button class="btn btn-primary btn-add" type="button" data-action="new-employee">＋ Add Employee</button>',
      countHtml: '<div class="card-title" style="margin:0 2px 10px;">Employees <span class="count">' + employees.length + '</span></div>',
      body: employees.length
        ? employees.map(employeeCard).join('')
        : emptyState('👷', 'No employees yet'),
    })
  }

  /* ---------- Installments ---------- */

  function installmentCard(plan) {
    const total = num(plan.totalAmount)
    const paid = (plan.installments || []).reduce(function (sum, i) {
      return sum + num(i.paidAmount)
    }, 0)
    const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0
    const dueCount = (plan.installments || []).filter(function (i) {
      return String(i.status).toLowerCase() !== 'paid'
    }).length
    return (
      '<div class="item-card">' +
      '<div class="item-main">' +
      '<div class="item-title">' + esc(plan.buyerName || 'Buyer') + '</div>' +
      '<div class="item-sub">' + esc(plan.propertyName || 'Property') + ' · ' + num(plan.numberOfPayments) + ' payments · ' + dueCount + ' remaining</div>' +
      '<div class="progress" style="margin:4px 0 2px;"><div class="progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="item-value">' + formatCurrency(paid) + ' <span class="muted">of ' + formatCurrency(total) + '</span>' +
      ' <span class="badge ' + badgeClass(plan.status) + '">' + esc(statusLabel(plan.status)) + '</span>' +
      '</div>' +
      '</div>' +
      itemActions([
        { action: 'pay-installment', id: plan.id, label: '💵 Record Payment', green: true },
      ]) +
      '</div>'
    )
  }

  function renderInstallments(list, meta) {
    list = Array.isArray(list) ? list : []
    return modulePage({
      offline: meta && meta.offline,
      countHtml: '<div class="card-title" style="margin:0 2px 10px;">Installment Plans <span class="count">' + list.length + '</span></div>',
      body: list.length ? list.map(installmentCard).join('') : emptyState('📅', 'No installment plans yet'),
    })
  }

  /* ------------------------------ REPORTS ------------------------------ */

  function renderReportsMenu() {
    let html = '<div class="screen">'
    html += '<div class="card-title" style="margin:0 2px 10px;">Reports</div>'
    html +=
      '<button class="rep-row-link" type="button" data-action="open-report" data-report="overview">' +
      '<span class="module-emoji">📊</span><div><div class="item-title">Business Overview</div><div class="item-sub">KPIs, top projects, profitability</div></div><span class="rep-arrow">›</span>' +
      '</button>'
    html +=
      '<button class="rep-row-link" type="button" data-action="open-report" data-report="pnl">' +
      '<span class="module-emoji">🧾</span><div><div class="item-title">Profit &amp; Loss</div><div class="item-sub">Revenue, costs and net income (year)</div></div><span class="rep-arrow">›</span>' +
      '</button>'
    html +=
      '<button class="rep-row-link" type="button" data-action="open-report" data-report="aging">' +
      '<span class="module-emoji">⏳</span><div><div class="item-title">Receivables Aging</div><div class="item-sub">Unpaid invoices by age bucket</div></div><span class="rep-arrow">›</span>' +
      '</button>'

    html += '<div class="card-title" style="margin:16px 2px 10px;">Available on the desktop</div>'
    const desktopOnly = [
      'Sales Report', 'Cash Flow Statement', 'Balance Sheet', 'Inventory Valuation',
      'Payroll Summary', 'Land Records Report', 'Property Portfolio', 'Contracts Report',
    ]
    html += desktopOnly.map(function (name) {
      return '<div class="rep-available">💻 ' + esc(name) + '</div>'
    }).join('')
    html += '</div>'
    return html
  }

  function reportCard(title, inner) {
    return (
      '<div class="card rep-card">' +
      '<div class="card-title">' + title + '</div>' +
      inner +
      '</div>'
    )
  }

  function repRow(key, value, cls) {
    return (
      '<tr>' +
      '<td class="rep-key">' + key + '</td>' +
      '<td class="num' + (cls ? ' ' + cls : '') + '">' + value + '</td>' +
      '</tr>'
    )
  }

  function renderReportOverview(data, meta) {
    let html = '<div class="screen">'
    if (meta && meta.offline) html += offlineBanner()

    html +=
      '<div class="card summary-card">' +
      '<div class="summary-item"><span class="summary-label">Revenue</span><span class="summary-value positive">' + formatCurrency(data.revenue) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Expenses</span><span class="summary-value negative">' + formatCurrency(data.expenses) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Net Profit</span><span class="summary-value">' + formatCurrency(data.netProfit) + '</span></div>' +
      '</div>'

    html +=
      '<div class="card summary-card">' +
      '<div class="summary-item"><span class="summary-label">Projects</span><span class="summary-value">' + num(data.totalProjects) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Properties</span><span class="summary-value">' + num(data.totalProperties) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Employees</span><span class="summary-value">' + num(data.activeEmployees) + '/' + num(data.employeeCount) + '</span></div>' +
      '</div>'

    html +=
      '<div class="card summary-card">' +
      '<div class="summary-item"><span class="summary-label">Inventory value</span><span class="summary-value">' + formatCurrency(data.inventoryValue) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Suppliers</span><span class="summary-value">' + num(data.totalSuppliers) + '</span></div>' +
      '<div class="summary-item"><span class="summary-label">Purchase orders</span><span class="summary-value">' + num(data.totalPOs) + '</span></div>' +
      '</div>'

    if (data.topProjects && data.topProjects.length) {
      html += reportCard('🏗️ Top Projects', (
        '<table class="rep-table">' +
        '<tr><th>Project</th><th class="num">Budget</th><th class="num">Spent</th></tr>' +
        data.topProjects.map(function (p) {
          return '<tr><td>' + esc(p.name) + '</td><td class="num">' + formatCurrency(p.budget) + '</td><td class="num">' + formatCurrency(p.spent) + '</td></tr>'
        }).join('') +
        '</table>'
      ))
    }

    if (data.projectProfitability && data.projectProfitability.length) {
      html += reportCard('💰 Project Profitability', (
        '<table class="rep-table">' +
        '<tr><th>Project</th><th class="num">Budgeted</th><th class="num">Spent</th><th class="num">Variance</th></tr>' +
        data.projectProfitability.map(function (p) {
          const v = num(p.variance)
          return '<tr><td>' + esc(p.name) + '</td><td class="num">' + formatCurrency(p.budgeted) + '</td><td class="num">' + formatCurrency(p.spent) + '</td><td class="num ' + (v < 0 ? 'neg' : 'pos') + '">' + formatCurrency(v) + '</td></tr>'
        }).join('') +
        '</table>'
      ))
    }

    if (data.monthlyRevenue && data.monthlyRevenue.length) {
      html += reportCard('📈 Monthly Revenue vs Expenses', (
        '<table class="rep-table">' +
        '<tr><th>Month</th><th class="num">Revenue</th><th class="num">Expenses</th></tr>' +
        data.monthlyRevenue.map(function (m, i) {
          const exp = (data.monthlyExpenses && data.monthlyExpenses[i]) ? num(data.monthlyExpenses[i].expenses) : 0
          return '<tr><td>' + esc(m.month) + '</td><td class="num pos">' + formatCurrency(m.revenue) + '</td><td class="num neg">' + formatCurrency(exp) + '</td></tr>'
        }).join('') +
        '</table>'
      ))
    }

    html += '</div>'
    return html
  }

  function renderReportPnl(data, meta) {
    let html = '<div class="screen">'
    if (meta && meta.offline) html += offlineBanner()
    html += '<div class="card">' +
      '<div class="card-title">Profit &amp; Loss · ' + esc(data.period || '') + '</div>' +
      '<table class="rep-table">' +
      repRow('Revenue', formatCurrency(data.revenue), 'pos') +
      repRow('Cost of Goods Sold', formatCurrency(data.cogs), 'neg') +
      repRow('Gross Profit', formatCurrency(data.grossProfit), data.grossProfit >= 0 ? 'pos' : 'neg') +
      repRow('Gross Margin', num(data.grossMargin) + '%') +
      repRow('Operating Expenses', formatCurrency(data.operatingExpenses && data.operatingExpenses.total), 'neg') +
      '<tr class="rep-total"><td>Net Income</td><td class="num ' + (num(data.netIncome) >= 0 ? 'pos' : 'neg') + '">' + formatCurrency(data.netIncome) + '</td></tr>' +
      repRow('Net Margin', num(data.netMargin) + '%') +
      '</table>' +
      '</div>'

    const breakdown = (data.operatingExpenses && data.operatingExpenses.breakdown) || {}
    const keys = Object.keys(breakdown)
    if (keys.length) {
      html += '<div class="card">' +
        '<div class="card-title">Operating Expense Breakdown</div>' +
        '<table class="rep-table">' +
        keys.map(function (k) {
          return '<tr><td>' + esc(k) + '</td><td class="num neg">' + formatCurrency(breakdown[k]) + '</td></tr>'
        }).join('') +
        '</table>' +
        '</div>'
    }
    html += '</div>'
    return html
  }

  function renderReportAging(data, meta) {
    let html = '<div class="screen">'
    if (meta && meta.offline) html += offlineBanner()
    const summary = data.summary || {}
    const buckets = ['0-30', '31-60', '61-90', '90+']
    html += '<div class="card">' +
      '<div class="card-title">Outstanding Balance by Age</div>' +
      '<table class="rep-table">' +
      buckets.map(function (b) {
        return '<tr><td>' + b + ' days</td><td class="num">' + formatCurrency(summary[b]) + '</td></tr>'
      }).join('') +
      '<tr class="rep-total"><td>Total Outstanding</td><td class="num">' + formatCurrency(data.totalOutstanding) + '</td></tr>' +
      '</table>' +
      '</div>'

    const invoices = (data.invoices || [])
    html += '<div class="card">' +
      '<div class="card-title">Unpaid Invoices <span class="count">' + invoices.length + '</span></div>' +
      (invoices.length
        ? '<table class="rep-table">' +
          '<tr><th>Invoice</th><th>Contact</th><th class="num">Days</th><th class="num">Balance</th></tr>' +
          invoices.map(function (inv) {
            return '<tr><td>' + esc(inv.invoiceNumber) + '</td><td>' + esc(inv.contactName) + '</td><td class="num">' + num(inv.daysOverdue) + '</td><td class="num">' + formatCurrency(inv.balance) + '</td></tr>'
          }).join('') +
          '</table>'
        : emptyState('🎉', 'No unpaid invoices')) +
      '</div>'
    html += '</div>'
    return html
  }

  /* ------------------------------ MODULE FORMS ------------------------------ */

  var PROPERTY_TYPES = ['apartment', 'house', 'villa', 'plot', 'commercial', 'warehouse']
  var PROPERTY_STATUSES = ['available', 'sold', 'rented', 'under_maintenance']
  var VEHICLE_STATUSES = ['active', 'maintenance', 'retired']
  var FUEL_TYPES = ['diesel', 'petrol', 'electric', 'hybrid']
  var ASSET_STATUSES = ['active', 'maintenance', 'retired', 'disposed']
  var ASSET_CATEGORIES = ['general', 'equipment', 'vehicle', 'furniture', 'computer', 'machinery', 'land', 'building']
  var EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern']
  var EMPLOYEE_STATUSES = ['active', 'inactive', 'on_notice', 'terminated']

  function renderPropertyForm(p) {
    p = p || {}
    const val = function (k) { return p[k] === undefined || p[k] === null ? '' : p[k] }
    return (
      '<form data-form="property" data-id="' + esc(p.id || '') + '">' +
      formLabel('Property name', true) +
      '<input id="f-name" class="form-input" value="' + esc(val('name')) + '" maxlength="200" placeholder="e.g. Sunrise Villas">' +

      formLabel('Price (GH₵)', true) +
      '<input id="f-price" class="form-input" type="number" min="0" step="0.01" value="' + esc(val('price')) + '" placeholder="0.00">' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Type') + '<select id="f-prop-type" class="form-select">' + optionsHtml(PROPERTY_TYPES, val('propertyType') || 'apartment') + '</select></div>' +
      '<div>' + formLabel('Status') + '<select id="f-prop-status" class="form-select">' + optionsHtml(PROPERTY_STATUSES, val('status') || 'available') + '</select></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Rental price') + '<input id="f-rental" class="form-input" type="number" min="0" step="0.01" value="' + esc(val('rentalPrice')) + '" placeholder="0.00"></div>' +
      '<div>' + formLabel('Area (sq ft)') + '<input id="f-area" class="form-input" type="number" min="0" step="0.01" value="' + esc(val('areaSqft')) + '" placeholder="0"></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Bedrooms') + '<input id="f-bed" class="form-input" type="number" min="0" step="1" value="' + esc(val('bedrooms')) + '" placeholder="0"></div>' +
      '<div>' + formLabel('Bathrooms') + '<input id="f-bath" class="form-input" type="number" min="0" step="1" value="' + esc(val('bathrooms')) + '" placeholder="0"></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('City') + '<input id="f-city" class="form-input" value="' + esc(val('city')) + '" maxlength="100" placeholder="e.g. Accra"></div>' +
      '<div>' + formLabel('State/Region') + '<input id="f-state" class="form-input" value="' + esc(val('state')) + '" maxlength="100" placeholder="e.g. Greater Accra"></div>' +
      '</div>' +

      formLabel('Address') +
      '<input id="f-address" class="form-input" value="' + esc(val('address')) + '" maxlength="500" placeholder="Street address">' +

      formLabel('Description') +
      '<textarea id="f-description" class="form-textarea" maxlength="2000" placeholder="Property description">' + esc(val('description')) + '</textarea>' +

      formButtons() +
      '</form>'
    )
  }

  function inventoryCategories(items) {
    const seen = {}
    const out = []
    ;(items || []).forEach(function (i) {
      if (i.category && i.category.id && !seen[i.category.id]) {
        seen[i.category.id] = true
        out.push(i.category)
      }
    })
    return out
  }

  function renderInventoryForm(item, categories) {
    item = item || {}
    const val = function (k) { return item[k] === undefined || item[k] === null ? '' : item[k] }
    let catOptions = '<option value="">— Auto —</option>'
    catOptions += (categories || []).map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (String(c.id) === String(val('categoryId')) ? ' selected' : '') + '>' + esc(c.name) + '</option>'
    }).join('')
    return (
      '<form data-form="inventory" data-id="' + esc(item.id || '') + '">' +
      formLabel('Item name', true) +
      '<input id="f-inv-name" class="form-input" value="' + esc(val('name')) + '" maxlength="200" placeholder="e.g. Cement (50kg)">' +

      formLabel('Unit of measure', true) +
      '<input id="f-inv-unit" class="form-input" value="' + esc(val('unitOfMeasure')) + '" maxlength="20" placeholder="e.g. bag">' +

      formLabel('Category') +
      '<select id="f-inv-cat" class="form-select">' + catOptions + '</select>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Current stock') + '<input id="f-inv-stock" class="form-input" type="number" min="0" step="any" value="' + esc(val('currentStock')) + '" placeholder="0"></div>' +
      '<div>' + formLabel('Reorder level') + '<input id="f-inv-min" class="form-input" type="number" min="0" step="any" value="' + esc(val('minStock')) + '" placeholder="0"></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Max stock') + '<input id="f-inv-max" class="form-input" type="number" min="0" step="any" value="' + esc(val('maxStock')) + '" placeholder="0"></div>' +
      '<div>' + formLabel('Unit cost') + '<input id="f-inv-cost" class="form-input" type="number" min="0" step="0.01" value="' + esc(val('unitCost')) + '" placeholder="0.00"></div>' +
      '</div>' +

      formLabel('Description') +
      '<textarea id="f-inv-desc" class="form-textarea" maxlength="2000" placeholder="Item description">' + esc(val('description')) + '</textarea>' +

      formButtons() +
      '</form>'
    )
  }

  function renderInventoryAdjustForm(item) {
    return (
      '<form data-form="inventory-adjust" data-id="' + esc(item.id) + '">' +
      '<div class="settings-row"><span>Item</span><b>' + esc(item.name) + '</b></div>' +
      '<div class="settings-row"><span>Current stock</span><b>' + num(item.currentStock).toLocaleString() + ' ' + esc(item.unitOfMeasure || '') + '</b></div>' +
      formLabel('New quantity', true) +
      '<input id="f-adj-stock" class="form-input" type="number" min="0" step="any" value="' + esc(item.currentStock) + '">' +
      '<div class="form-hint">Enter the new stock level. The item quantity is updated directly.</div>' +
      formButtons() +
      '</form>'
    )
  }

  function poItemRowHtml() {
    return (
      '<div class="inv-item po-item">' +
      '<input class="form-input po-item-desc" placeholder="Description — e.g. Cement bags" maxlength="500">' +
      '<div class="inv-item-cols">' +
      '<input class="form-input po-item-qty" type="number" min="1" step="1" value="1">' +
      '<input class="form-input po-item-price" type="number" min="0" step="0.01" placeholder="Unit price (GH₵)">' +
      '<button class="btn-sm btn-sm-danger remove-po-item" type="button" data-action="remove-po-item">✕</button>' +
      '</div>' +
      '</div>'
    )
  }

  function supplierOptions(suppliers, selected) {
    let html = '<option value="">— Select supplier —</option>'
    html += (suppliers || []).map(function (s) {
      return '<option value="' + esc(s.id) + '"' + (String(s.id) === String(selected) ? ' selected' : '') + '>' + esc(s.name) + '</option>'
    }).join('')
    return html
  }

  function renderProcurementCreateForm(suppliers) {
    return (
      '<form data-form="procurement">' +
      formLabel('Supplier', true) +
      '<select id="f-po-supplier" class="form-select">' + supplierOptions(suppliers) + '</select>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Order date') + '<input id="f-po-order" class="form-input" type="date" value="' + toDateInput(0) + '"></div>' +
      '<div>' + formLabel('Expected delivery') + '<input id="f-po-delivery" class="form-input" type="date"></div>' +
      '</div>' +

      formLabel('Line items') +
      '<div id="po-items">' + poItemRowHtml() + '</div>' +
      '<button class="btn-sm" type="button" data-action="add-po-item">＋ Add item</button>' +
      '<div id="po-totals" class="inv-totals"></div>' +

      formButtons() +
      '</form>'
    )
  }

  function allowedPoTransitions(status) {
    const map = {
      draft: ['approved', 'cancelled'],
      approved: ['received', 'cancelled'],
      received: [],
      cancelled: [],
    }
    return map[String(status || 'draft')] || []
  }

  function renderProcurementEditForm(suppliers, po) {
    const allowed = allowedPoTransitions(po.status)
    let statusField = ''
    if (allowed.length) {
      statusField =
        formLabel('Update status') +
        '<select id="f-po-status" class="form-select">' +
        '<option value="">— Keep ' + esc(statusLabel(po.status)) + ' —</option>' +
        optionsHtml(allowed) +
        '</select>'
    } else {
      statusField =
        '<div class="settings-row"><span>Status</span><b>' + esc(statusLabel(po.status)) + '</b></div>' +
        '<div class="form-hint">Status cannot be changed from "' + esc(statusLabel(po.status)) + '".</div>'
    }
    return (
      '<form data-form="procurement-edit" data-id="' + esc(po.id) + '">' +
      formLabel('Supplier') +
      '<select id="f-po-supplier" class="form-select">' + supplierOptions(suppliers, po.supplierId) + '</select>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Order date') + '<input id="f-po-order" class="form-input" type="date" value="' + esc(dateValue(po.orderDate)) + '"></div>' +
      '<div>' + formLabel('Expected delivery') + '<input id="f-po-delivery" class="form-input" type="date" value="' + esc(dateValue(po.expectedDelivery)) + '"></div>' +
      '</div>' +

      statusField +
      formButtons() +
      '</form>'
    )
  }

  function renderProcurementDetail(po) {
    const items = po.items || []
    return (
      '<div>' +
      '<div class="settings-row"><span>PO number</span><b>' + esc(po.poNumber) + '</b></div>' +
      '<div class="settings-row"><span>Supplier</span><b>' + esc(po.supplierName) + '</b></div>' +
      '<div class="settings-row"><span>Order date</span><b>' + formatDate(po.orderDate) + '</b></div>' +
      '<div class="settings-row"><span>Expected delivery</span><b>' + formatDate(po.expectedDelivery) + '</b></div>' +
      '<div class="settings-row"><span>Status</span><b><span class="badge ' + badgeClass(po.status) + '">' + esc(statusLabel(po.status)) + '</span></b></div>' +
      '<table class="rep-table" style="margin-top:10px;">' +
      '<tr><th>Item</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr>' +
      items.map(function (i) {
        return '<tr><td>' + esc(i.description || '—') + '</td><td class="num">' + num(i.quantity) + '</td><td class="num">' + formatCurrency(i.unitPrice) + '</td><td class="num">' + formatCurrency(i.amount) + '</td></tr>'
      }).join('') +
      '<tr class="rep-total"><td colspan="3">Total</td><td class="num">' + formatCurrency(po.totalAmount) + '</td></tr>' +
      '</table>' +
      '<button class="btn btn-outline" type="button" data-action="close-modal" style="margin-top:16px;">Close</button>' +
      '</div>'
    )
  }

  function renderFleetForm(v) {
    v = v || {}
    const val = function (k) { return v[k] === undefined || v[k] === null ? '' : v[k] }
    return (
      '<form data-form="fleet" data-id="' + esc(v.id || '') + '">' +
      formLabel('Vehicle name', true) +
      '<input id="f-fleet-name" class="form-input" value="' + esc(val('name')) + '" maxlength="200" placeholder="e.g. Toyota Hilux">' +

      formLabel('License plate', true) +
      '<input id="f-fleet-plate" class="form-input" value="' + esc(val('licensePlate')) + '" maxlength="20" placeholder="e.g. GR-1234">' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Make') + '<input id="f-fleet-make" class="form-input" value="' + esc(val('make')) + '" maxlength="100" placeholder="e.g. Toyota"></div>' +
      '<div>' + formLabel('Model') + '<input id="f-fleet-model" class="form-input" value="' + esc(val('model')) + '" maxlength="100" placeholder="e.g. Hilux"></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Year') + '<input id="f-fleet-year" class="form-input" type="number" min="1950" max="2100" step="1" value="' + esc(val('year')) + '" placeholder="2024"></div>' +
      '<div>' + formLabel('Status') + '<select id="f-fleet-status" class="form-select">' + optionsHtml(VEHICLE_STATUSES, val('status') || 'active') + '</select></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Fuel type') + '<select id="f-fleet-fuel" class="form-select">' + optionsHtml(FUEL_TYPES, val('fuelType') || 'diesel') + '</select></div>' +
      '<div>' + formLabel('Mileage (km)') + '<input id="f-fleet-mileage" class="form-input" type="number" min="0" step="1" value="' + esc(val('mileage')) + '" placeholder="0"></div>' +
      '</div>' +

      formButtons() +
      '</form>'
    )
  }

  function renderAssetForm(a) {
    a = a || {}
    const val = function (k) { return a[k] === undefined || a[k] === null ? '' : a[k] }
    return (
      '<form data-form="asset" data-id="' + esc(a.id || '') + '">' +
      formLabel('Asset name', true) +
      '<input id="f-asset-name" class="form-input" value="' + esc(val('name')) + '" maxlength="200" placeholder="e.g. Tower Crane">' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Category') + '<select id="f-asset-cat" class="form-select">' + optionsHtml(ASSET_CATEGORIES, val('category') || 'general') + '</select></div>' +
      '<div>' + formLabel('Status') + '<select id="f-asset-status" class="form-select">' + optionsHtml(ASSET_STATUSES, val('status') || 'active') + '</select></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Purchase date') + '<input id="f-asset-pdate" class="form-input" type="date" value="' + esc(dateValue(val('purchaseDate'))) + '"></div>' +
      '<div>' + formLabel('Location') + '<input id="f-asset-loc" class="form-input" value="' + esc(val('location')) + '" maxlength="300" placeholder="e.g. Accra site"></div>' +
      '</div>' +

      '<div class="form-grid">' +
      '<div>' + formLabel('Purchase price') + '<input id="f-asset-pprice" class="form-input" type="number" min="0" step="0.01" value="' + esc(val('purchasePrice')) + '" placeholder="0.00"></div>' +
      '<div>' + formLabel('Current value') + '<input id="f-asset-cvalue" class="form-input" type="number" min="0" step="0.01" value="' + esc(val('currentValue')) + '" placeholder="0.00"></div>' +
      '</div>' +

      formLabel('Insurance expiry') +
      '<input id="f-asset-iexp" class="form-input" type="date" value="' + esc(dateValue(val('insuranceExpiry'))) + '">' +

      formButtons() +
      '</form>'
    )
  }

  function departmentOptions(departments, selected) {
    let html = '<option value="">— Select department —</option>'
    html += (departments || []).map(function (d) {
      return '<option value="' + esc(d.id) + '"' + (String(d.id) === String(selected) ? ' selected' : '') + '>' + esc(d.name) + '</option>'
    }).join('')
    return html
  }

  function renderEmployeeForm(departments, e) {
    if (!e) {
      return (
        '<form data-form="employee-new">' +
        '<div class="form-grid">' +
        '<div>' + formLabel('First name', true) + '<input id="f-emp-first" class="form-input" maxlength="100"></div>' +
        '<div>' + formLabel('Last name', true) + '<input id="f-emp-last" class="form-input" maxlength="100"></div>' +
        '</div>' +
        formLabel('Designation') +
        '<input id="f-emp-designation" class="form-input" maxlength="200" placeholder="e.g. Site Engineer">' +
        formLabel('Department', true) +
        '<select id="f-emp-dept" class="form-select">' + departmentOptions(departments) + '</select>' +
        '<div class="form-grid">' +
        '<div>' + formLabel('Employment type') + '<select id="f-emp-type" class="form-select">' + optionsHtml(EMPLOYMENT_TYPES, 'full_time') + '</select></div>' +
        '<div>' + formLabel('Salary (GH₵)') + '<input id="f-emp-salary" class="form-input" type="number" min="0" step="0.01" placeholder="0.00"></div>' +
        '</div>' +
        formButtons() +
        '</form>'
      )
    }
    const val = function (k) { return e[k] === undefined || e[k] === null ? '' : e[k] }
    return (
      '<form data-form="employee" data-id="' + esc(e.id) + '">' +
      formLabel('Employee ID', true) +
      '<input id="f-emp-id" class="form-input" value="' + esc(val('employeeId')) + '" maxlength="50">' +
      formLabel('Designation', true) +
      '<input id="f-emp-designation" class="form-input" value="' + esc(val('designation')) + '" maxlength="200">' +
      formLabel('Department', true) +
      '<select id="f-emp-dept" class="form-select">' + departmentOptions(departments, val('departmentId')) + '</select>' +
      '<div class="form-grid">' +
      '<div>' + formLabel('Employment type') + '<select id="f-emp-type" class="form-select">' + optionsHtml(EMPLOYMENT_TYPES, val('employmentType') || 'full_time') + '</select></div>' +
      '<div>' + formLabel('Date of joining', true) + '<input id="f-emp-join" class="form-input" type="date" value="' + esc(dateValue(val('dateOfJoining'))) + '"></div>' +
      '</div>' +
      '<div class="form-grid">' +
      '<div>' + formLabel('Salary (GH₵)', true) + '<input id="f-emp-salary" class="form-input" type="number" min="0" step="0.01" value="' + esc(val('salary')) + '"></div>' +
      '<div>' + formLabel('Status') + '<select id="f-emp-status" class="form-select">' + optionsHtml(EMPLOYEE_STATUSES, val('status') || 'active') + '</select></div>' +
      '</div>' +
      formButtons() +
      '</form>'
    )
  }

  function renderInstallmentPayForm(plan) {
    const installments = (plan && plan.installments) || []
    const unpaid = installments.filter(function (i) {
      return String(i.status).toLowerCase() !== 'paid'
    })
    if (!unpaid.length) {
      return '<div class="empty-state"><div class="empty-emoji">🎉</div><p class="muted">All installments for this plan are paid.</p></div>'
    }
    let invOptions = ''
    unpaid.forEach(function (i) {
      invOptions += '<option value="' + esc(i.id) + '">' +
        '#' + num(i.installmentNumber) + ' — ' + formatCurrency(i.amount) +
        ' · due ' + formatDate(i.dueDate) +
        '</option>'
    })
    return (
      '<form data-form="installment-pay" data-plan-id="' + esc(plan.id) + '">' +
      '<div class="settings-row"><span>Buyer</span><b>' + esc(plan.buyerName || '—') + '</b></div>' +
      formLabel('Installment', true) +
      '<select id="f-inst-id" class="form-select">' + invOptions + '</select>' +
      '<div class="form-grid">' +
      '<div>' + formLabel('Payment date') + '<input id="f-inst-date" class="form-input" type="date" value="' + toDateInput(0) + '"></div>' +
      '<div>' + formLabel('Amount paid') + '<input id="f-inst-amount" class="form-input" type="number" min="0" step="0.01" placeholder="0.00"></div>' +
      '</div>' +
      formLabel('Notes') +
      '<textarea id="f-inst-notes" class="form-textarea" maxlength="2000" placeholder="Optional note"></textarea>' +
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
    renderMore: renderMore,
    renderModuleUnavailable: renderModuleUnavailable,
    renderProperties: renderProperties,
    renderInventory: renderInventory,
    renderProcurement: renderProcurement,
    renderFleet: renderFleet,
    renderAssets: renderAssets,
    renderEmployees: renderEmployees,
    renderInstallments: renderInstallments,
    renderReportsMenu: renderReportsMenu,
    renderReportOverview: renderReportOverview,
    renderReportPnl: renderReportPnl,
    renderReportAging: renderReportAging,
    renderPropertyForm: renderPropertyForm,
    renderInventoryForm: renderInventoryForm,
    renderInventoryAdjustForm: renderInventoryAdjustForm,
    renderProcurementCreateForm: renderProcurementCreateForm,
    renderProcurementEditForm: renderProcurementEditForm,
    renderProcurementDetail: renderProcurementDetail,
    renderFleetForm: renderFleetForm,
    renderAssetForm: renderAssetForm,
    renderEmployeeForm: renderEmployeeForm,
    renderInstallmentPayForm: renderInstallmentPayForm,
    inventoryCategories: inventoryCategories,
    allowedPoTransitions: allowedPoTransitions,
    poItemRowHtml: poItemRowHtml,
  }
})()
