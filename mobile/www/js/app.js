(function () {
  'use strict'

  var API = window.BuildPropApi
  var S = window.BuildPropScreens

  var STORE = {
    serverUrl: 'buildprop_server_url',
    token: 'buildprop_token',
    user: 'buildprop_user',
    dashboard: 'buildprop_cache_dashboard',
    projects: 'buildprop_cache_projects',
    finance: 'buildprop_cache_finance',
  }

  var ROUTE_TITLES = {
    home: 'BuildProp Monitor',
    projects: 'Projects',
    finance: 'Finance',
    alerts: 'Alerts',
    settings: 'Settings',
  }

  var state = {
    user: null,
    serverUrl: '',
    offline: false,
    route: null,
    detailName: null,
    cache: {
      dashboard: null,
      projects: null,
      finance: null,
    },
  }

  function $(sel) { return document.querySelector(sel) }

  /* ------------------------------ storage helpers ------------------------------ */

  function storeGet(key) {
    try { return localStorage.getItem(key) } catch (e) { return null }
  }

  function storeSet(key, value) {
    try { localStorage.setItem(key, value) } catch (e) {}
  }

  function storeDel(key) {
    try { localStorage.removeItem(key) } catch (e) {}
  }

  function cacheGet(key) {
    var raw = storeGet(key)
    if (!raw) return null
    try { return JSON.parse(raw) } catch (e) { return null }
  }

  /* ------------------------------ boot ------------------------------ */

  function boot() {
    API.configure(storeGet(STORE.serverUrl) || '')
    API.setToken(storeGet(STORE.token) || '')
    try { state.user = JSON.parse(storeGet(STORE.user) || 'null') } catch (e) { state.user = null }
    state.serverUrl = API.getBaseUrl()
    state.cache.dashboard = cacheGet(STORE.dashboard)
    state.cache.projects = cacheGet(STORE.projects)
    state.cache.finance = cacheGet(STORE.finance)

    if (API.getToken() && state.user && state.serverUrl) {
      enterApp()
    } else {
      showLogin()
    }
  }

  function enterApp() {
    $('#login-view').classList.add('hidden')
    $('#app-view').classList.remove('hidden')
    if (!location.hash || location.hash === '#') {
      location.replace('#/home')
    } else {
      renderRoute()
    }
  }

  function showLogin(message) {
    $('#app-view').classList.add('hidden')
    $('#login-view').classList.remove('hidden')
    var serverInput = $('#login-server')
    if (serverInput && !serverInput.value) {
      serverInput.value = storeGet(STORE.serverUrl) || ''
    }
    hideLoading()
    if (message) showLoginError(message)
  }

  function showLoginError(message) {
    var el = $('#login-error')
    if (el) el.textContent = message || ''
  }

  function showLoading(text) {
    $('#loading-text').textContent = text || 'Loading…'
    $('#loading').classList.remove('hidden')
  }

  function hideLoading() {
    $('#loading').classList.add('hidden')
  }

  /* ------------------------------ login handlers ------------------------------ */

  async function onTest() {
    var el = $('#conn-status')
    var url = $('#login-server').value.trim()
    el.classList.add('show')
    el.className = 'conn-status testing'
    el.textContent = 'Testing connection…'
    if (!url) {
      el.className = 'conn-status err show'
      el.textContent = '❌ Enter a server address first.'
      return
    }
    try {
      await API.testConnection(url)
      el.className = 'conn-status ok show'
      el.textContent = '✅ Server reachable'
    } catch (err) {
      el.className = 'conn-status err show'
      el.textContent = '❌ ' + (err && err.message ? err.message : 'Server not reachable')
    }
  }

  async function onSignIn() {
    var url = $('#login-server').value.trim()
    var email = $('#login-email').value.trim()
    var password = $('#login-password').value

    showLoginError('')
    if (!url || !email || !password) {
      showLoginError('Please fill in all fields.')
      return
    }

    showLoading('Signing in…')
    API.configure(url)
    try {
      var res = await API.apiFetch('/api/mobile/auth', {
        method: 'POST',
        body: { email: email, password: password },
      })
      if (!res || !res.token) throw new Error('Server did not return an auth token.')

      storeSet(STORE.serverUrl, url)
      storeSet(STORE.token, res.token)
      storeSet(STORE.user, JSON.stringify(res.user))
      API.configure(url)
      API.setToken(res.token)
      state.user = res.user
      state.serverUrl = url

      hideLoading()
      showLoginError('')
      enterApp()
    } catch (err) {
      hideLoading()
      showLoginError(friendlyMessage(err))
    }
  }

  function friendlyMessage(err) {
    if (!err) return 'Something went wrong.'
    if (err.status === 401) {
      return err.message || 'Invalid email or password.'
    }
    return err.message || 'Something went wrong.'
  }

  /* ------------------------------ routing ------------------------------ */

  function parseRoute() {
    var raw = (location.hash || '#/home').replace(/^#\/?/, '')
    var parts = raw.split('/').filter(Boolean)
    if (parts[0] === 'projects' && parts[1]) {
      return { name: 'project', tab: 'projects', id: decodeURIComponent(parts[1]) }
    }
    if (['home', 'projects', 'finance', 'alerts', 'settings'].indexOf(parts[0]) !== -1) {
      return { name: parts[0], tab: parts[0] }
    }
    return { name: 'home', tab: 'home' }
  }

  function navigate(path) {
    if (location.hash === '#' + path) {
      renderRoute()
      return
    }
    location.hash = path
  }

  function renderRoute() {
    var route = parseRoute()
    state.route = route
    var pushed = route.name === 'project'

    $('#tabbar').classList.toggle('hidden', pushed)
    $('#screen-container').scrollTop = 0
    setActiveTab(route.tab)
    updateHeader(route)

    switch (route.name) {
      case 'home':
        renderHome()
        break
      case 'projects':
        renderProjectsList()
        break
      case 'project':
        renderProjectDetail(route.id)
        break
      case 'finance':
        renderFinance()
        break
      case 'alerts':
        renderAlerts()
        break
      case 'settings':
        renderSettingsScreen()
        break
      default:
        navigate('/home')
    }
  }

  function setActiveTab(name) {
    var tabs = document.querySelectorAll('.tab-btn')
    for (var i = 0; i < tabs.length; i++) {
      var tab = tabs[i]
      tab.classList.toggle('active', tab.getAttribute('data-tab') === name)
    }
  }

  function updateHeader(route) {
    var back = $('#btn-back')
    var refresh = $('#btn-refresh')
    var title = $('#header-title')
    if (route.name === 'project') {
      back.classList.remove('hidden')
      refresh.classList.add('hidden')
      title.textContent = state.detailName || 'Project'
    } else {
      back.classList.add('hidden')
      refresh.classList.toggle('hidden', !(route.name === 'home' || route.name === 'projects' || route.name === 'finance'))
      title.textContent = ROUTE_TITLES[route.name] || 'BuildProp Monitor'
    }
  }

  /* ------------------------------ shared UI ------------------------------ */

  function loadingScreen() {
    return '<div class="loading-screen"><div class="spinner"></div><p class="muted">Loading…</p></div>'
  }

  function errorScreen(err) {
    return (
      '<div class="empty-state">' +
      '<div class="empty-emoji">😕</div>' +
      '<p class="muted">' + S.esc(err && err.message ? err.message : 'Something went wrong.') + '</p>' +
      '<button class="btn btn-outline" type="button" data-action="retry">Retry</button>' +
      '</div>'
    )
  }

  function isSessionError(err) {
    return err && err.status === 401
  }

  function handleSessionError(err) {
    if (isSessionError(err)) {
      clearSession()
      showLogin('Your session has expired. Please sign in again.')
      return true
    }
    return false
  }

  /* ------------------------------ data loaders ------------------------------ */

  function routeKey() {
    var r = state.route
    if (!r) return ''
    return r.name + (r.name === 'project' && r.id ? ':' + r.id : '')
  }

  function staleRoute(expected) {
    return routeKey() !== expected
  }

  async function renderHome() {
    var sc = $('#screen-container')
    var expected = routeKey()
    sc.innerHTML = loadingScreen()
    try {
      var data = await API.apiFetch('/api/dashboard')
      if (staleRoute(expected)) return
      state.cache.dashboard = data
      storeSet(STORE.dashboard, JSON.stringify(data))
      state.offline = false
      sc.innerHTML = S.renderHome({ dashboard: data, user: state.user, offline: false })
    } catch (err) {
      if (staleRoute(expected)) return
      if (handleSessionError(err)) return
      state.offline = true
      if (state.cache.dashboard) {
        sc.innerHTML = S.renderHome({ dashboard: state.cache.dashboard, user: state.user, offline: true })
      } else {
        sc.innerHTML = errorScreen(err)
      }
    }
  }

  async function renderProjectsList() {
    var sc = $('#screen-container')
    var expected = routeKey()
    sc.innerHTML = loadingScreen()
    try {
      var data = await API.apiFetch('/api/projects?limit=200')
      if (staleRoute(expected)) return
      state.cache.projects = data
      storeSet(STORE.projects, JSON.stringify(data))
      state.offline = false
      sc.innerHTML = S.renderProjects(data, { offline: false })
    } catch (err) {
      if (staleRoute(expected)) return
      if (handleSessionError(err)) return
      state.offline = true
      if (state.cache.projects) {
        sc.innerHTML = S.renderProjects(state.cache.projects, { offline: true })
      } else {
        sc.innerHTML = errorScreen(err)
      }
    }
  }

  async function renderProjectDetail(id) {
    var sc = $('#screen-container')
    var expected = routeKey()
    sc.innerHTML = loadingScreen()
    try {
      var project = await API.apiFetch('/api/projects/' + encodeURIComponent(id))
      if (staleRoute(expected)) return
      storeSet('buildprop_cache_project_' + id, JSON.stringify(project))
      state.detailName = project.name || 'Project'
      updateHeader(state.route)
      sc.innerHTML = S.renderProjectDetail(project, { offline: false })
    } catch (err) {
      if (staleRoute(expected)) return
      if (handleSessionError(err)) return
      var cached = cacheGet('buildprop_cache_project_' + id)
      if (cached) {
        state.offline = true
        state.detailName = cached.name || 'Project'
        updateHeader(state.route)
        sc.innerHTML = S.renderProjectDetail(cached, { offline: true })
      } else {
        sc.innerHTML = errorScreen(err)
      }
    }
  }

  async function renderFinance() {
    var sc = $('#screen-container')
    var expected = routeKey()
    sc.innerHTML = loadingScreen()
    try {
      var results = await Promise.all([
        API.apiFetch('/api/invoices'),
        API.apiFetch('/api/payments'),
      ])
      if (staleRoute(expected)) return
      var finance = {
        invoices: Array.isArray(results[0]) ? results[0] : [],
        payments: Array.isArray(results[1]) ? results[1] : [],
      }
      state.cache.finance = finance
      storeSet(STORE.finance, JSON.stringify(finance))
      state.offline = false
      sc.innerHTML = S.renderFinance(finance, { offline: false })
    } catch (err) {
      if (handleSessionError(err)) return
      state.offline = true
      if (state.cache.finance) {
        sc.innerHTML = S.renderFinance(state.cache.finance, { offline: true })
      } else {
        sc.innerHTML = errorScreen(err)
      }
    }
  }

  async function renderAlerts() {
    var sc = $('#screen-container')
    sc.innerHTML = S.renderAlerts(deriveAlerts())
    try {
      await refreshAllData()
      sc.innerHTML = S.renderAlerts(deriveAlerts())
    } catch (err) {
      // alerts are derived from cache; keep current view
    }
  }

  function renderSettingsScreen() {
    $('#screen-container').innerHTML = S.renderSettings({
      user: state.user,
      serverUrl: state.serverUrl || storeGet(STORE.serverUrl) || '',
    })
  }

  /* ------------------------------ alerts derivation ------------------------------ */

  function deriveAlerts() {
    var alerts = []
    var now = Date.now()
    var DAY = 86400000
    var finance = state.cache.finance
    var dashboard = state.cache.dashboard
    var projects = state.cache.projects

    if (finance && finance.invoices) {
      finance.invoices.forEach(function (inv) {
        var status = String(inv.status || '').toLowerCase()
        var due = inv.dueDate ? new Date(inv.dueDate) : null
        var isPaid = status === 'paid'
        var isOverdue = status === 'overdue' || (due && !isPaid && due.getTime() < now)
        if (!isOverdue) return
        var days = due ? Math.ceil((due.getTime() - now) / DAY) : 0
        alerts.push({
          severity: 'red',
          icon: '⚠️',
          title: (inv.invoiceNumber || 'Invoice') + ' overdue',
          detail: (inv.contactName || 'Unknown') +
            ' · ' + S.formatCurrency(num(inv.totalAmount)) +
            ' · due ' + S.formatDate(inv.dueDate) +
            (days < 0 ? ' · ' + Math.abs(days) + 'd late' : ''),
        })
      })
    }

    var budgetRows = []
    if (dashboard && dashboard.projectProfitability) {
      budgetRows = dashboard.projectProfitability.slice()
    } else if (projects && projects.projects) {
      budgetRows = projects.projects.map(function (p) {
        return { name: p.name, status: p.status, budgeted: p.estimatedBudget, spent: p.actualCost }
      })
    }
    budgetRows.forEach(function (row) {
      var budgeted = num(row.budgeted || row.budget)
      var spent = num(row.spent)
      if (budgeted <= 0) return
      var pct = (spent / budgeted) * 100
      if (pct < 90) return
      alerts.push({
        severity: pct >= 100 ? 'red' : 'yellow',
        icon: '💰',
        title: (row.name || 'Project') + (pct >= 100 ? ' over budget' : ' near budget'),
        detail: S.formatCurrency(spent) + ' spent of ' + S.formatCurrency(budgeted) + ' · ' + Math.round(pct) + '%',
      })
    })

    if (dashboard && dashboard.upcomingTasks) {
      dashboard.upcomingTasks.forEach(function (t) {
        if (!t.dueDate) return
        var due = new Date(t.dueDate)
        var diff = Math.ceil((due.getTime() - now) / DAY)
        if (diff > 3) return
        var overdue = diff < 0
        alerts.push({
          severity: overdue ? 'red' : 'yellow',
          icon: '📋',
          title: (t.title || 'Task') + (overdue ? ' (overdue)' : ''),
          detail: 'Due ' + S.formatDate(t.dueDate) +
            (overdue ? ' · ' + Math.abs(diff) + 'd late' : diff === 0 ? ' · today' : ' · in ' + diff + 'd'),
        })
      })
    }

    alerts.sort(function (a, b) {
      if (a.severity === b.severity) return 0
      return a.severity === 'red' ? -1 : 1
    })
    return alerts.slice(0, 30)
  }

  function num(v) {
    var n = Number(v)
    return isNaN(n) ? 0 : n
  }

  /* ------------------------------ refresh ------------------------------ */

  async function refreshAllData() {
    var errors = []
    try {
      var data = await API.apiFetch('/api/dashboard')
      state.cache.dashboard = data
      storeSet(STORE.dashboard, JSON.stringify(data))
      state.offline = false
    } catch (err) {
      if (handleSessionError(err)) return
      state.offline = true
      errors.push(err)
    }
    try {
      var proj = await API.apiFetch('/api/projects?limit=200')
      state.cache.projects = proj
      storeSet(STORE.projects, JSON.stringify(proj))
    } catch (err) {
      if (handleSessionError(err)) return
      errors.push(err)
    }
    try {
      var results = await Promise.all([
        API.apiFetch('/api/invoices'),
        API.apiFetch('/api/payments'),
      ])
      var finance = {
        invoices: Array.isArray(results[0]) ? results[0] : [],
        payments: Array.isArray(results[1]) ? results[1] : [],
      }
      state.cache.finance = finance
      storeSet(STORE.finance, JSON.stringify(finance))
    } catch (err) {
      if (handleSessionError(err)) return
      errors.push(err)
    }
    if (errors.length && state.cache.dashboard) {
      state.offline = true
    }
  }

  function refreshCurrent() {
    var route = state.route
    if (!route) return Promise.resolve()
    switch (route.name) {
      case 'home':
        return renderHome()
      case 'projects':
        return renderProjectsList()
      case 'finance':
        return renderFinance()
      case 'alerts':
        return renderAlerts()
      default:
        return Promise.resolve()
    }
  }

  /* ------------------------------ pull-to-refresh ------------------------------ */

  function setupPullToRefresh() {
    var sc = $('#screen-container')
    var ptr = $('#ptr')
    var startY = 0
    var pulling = false
    var pulled = 0
    var TRIGGER = 70

    sc.addEventListener('touchstart', function (e) {
      if (sc.scrollTop <= 0 && isRefreshable()) {
        startY = e.touches[0].clientY
        pulling = true
        pulled = 0
      }
    }, { passive: true })

    sc.addEventListener('touchmove', function (e) {
      if (!pulling) return
      var dy = e.touches[0].clientY - startY
      if (dy <= 0 || sc.scrollTop > 0) {
        ptr.style.height = '0px'
        return
      }
      pulled = dy
      ptr.style.height = Math.min(80, dy * 0.5) + 'px'
      ptr.textContent = pulled >= TRIGGER ? 'Release to refresh…' : 'Pull to refresh…'
    }, { passive: true })

    sc.addEventListener('touchend', function () {
      if (!pulling) return
      pulling = false
      if (pulled >= TRIGGER) {
        ptr.textContent = 'Refreshing…'
        refreshCurrent().finally(function () {
          setTimeout(function () {
            ptr.style.height = '0px'
          }, 250)
        })
      } else {
        ptr.style.height = '0px'
      }
    }, { passive: true })
  }

  function isRefreshable() {
    var route = state.route
    return route && (route.name === 'home' || route.name === 'projects' || route.name === 'finance')
  }

  /* ------------------------------ session ------------------------------ */

  function clearSession() {
    storeDel(STORE.serverUrl)
    storeDel(STORE.token)
    storeDel(STORE.user)
    API.configure('')
    API.setToken('')
    state.user = null
    state.serverUrl = ''
    state.detailName = null
  }

  function signOut() {
    clearSession()
    location.replace('#')
    showLogin('Signed out successfully.')
  }

  function changeServer() {
    storeDel(STORE.token)
    storeDel(STORE.user)
    API.setToken('')
    state.user = null
    state.detailName = null
    location.replace('#')
    showLogin('Enter the new server address and sign in again.')
  }

  /* ------------------------------ events ------------------------------ */

  function wireEvents() {
    $('#btn-test').addEventListener('click', onTest)
    $('#btn-signin').addEventListener('click', onSignIn)
    $('#login-password').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onSignIn()
    })
    $('#login-server').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') onTest()
    })

    $('#app-header').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]')
      if (!btn) return
      var action = btn.getAttribute('data-action')
      if (action === 'back') {
        history.back()
      } else if (action === 'refresh') {
        refreshCurrent()
      }
    })

    $('#tabbar').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tab]')
      if (!btn) return
      var tab = btn.getAttribute('data-tab')
      navigate('/' + tab)
    })

    $('#screen-container').addEventListener('click', function (e) {
      var open = e.target.closest('[data-id]')
      if (open) {
        navigate('/projects/' + encodeURIComponent(open.getAttribute('data-id')))
        return
      }
      var btn = e.target.closest('[data-action]')
      if (!btn) return
      var action = btn.getAttribute('data-action')
      if (action === 'sign-out') signOut()
      else if (action === 'change-server') changeServer()
      else if (action === 'retry') refreshCurrent()
    })

    window.addEventListener('hashchange', renderRoute)

    setupPullToRefresh()
  }

  /* ------------------------------ start ------------------------------ */

  wireEvents()
  boot()
})()
