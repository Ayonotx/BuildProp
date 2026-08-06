(function () {
  'use strict'

  var API = window.BuildPropApi
  var S = window.BuildPropScreens

  var STORE = {
    serverUrl: 'buildprop_server_url',
    token: 'buildprop_token',
    user: 'buildprop_user',
    loginEmail: 'buildprop_login_email',
    loginPassword: 'buildprop_login_password',
    dashboard: 'buildprop_cache_dashboard',
    projects: 'buildprop_cache_projects',
    finance: 'buildprop_cache_finance',
    contacts: 'buildprop_cache_contacts',
    properties: 'buildprop_cache_properties',
    inventory: 'buildprop_cache_inventory',
    procurement: 'buildprop_cache_procurement',
    fleet: 'buildprop_cache_fleet',
    assets: 'buildprop_cache_assets',
    employees: 'buildprop_cache_employees',
    installments: 'buildprop_cache_installments',
    reports: 'buildprop_cache_reports',
  }

  var ROUTE_TITLES = {
    home: 'BuildProp',
    projects: 'Projects',
    finance: 'Finance',
    contacts: 'Contacts',
    alerts: 'Alerts',
    settings: 'Settings',
    more: 'More',
  }

  var MODULE_META = {
    properties: { title: 'Properties', api: '/api/properties' },
    inventory: { title: 'Inventory', api: '/api/inventory' },
    procurement: { title: 'Procurement', api: '/api/procurement' },
    fleet: { title: 'Fleet', api: '/api/fleet' },
    assets: { title: 'Assets', api: '/api/assets' },
    employees: { title: 'Employees', api: '/api/hr' },
    installments: { title: 'Installments', api: '/api/installments' },
    reports: { title: 'Reports', api: null },
  }

  var MODULE_RENDERERS = {
    properties: 'renderProperties',
    inventory: 'renderInventory',
    procurement: 'renderProcurement',
    fleet: 'renderFleet',
    assets: 'renderAssets',
    employees: 'renderEmployees',
    installments: 'renderInstallments',
  }

  var REPORT_META = {
    overview: { title: 'Business Overview', api: '/api/reports' },
    pnl: { title: 'Profit & Loss', api: '/api/reports/pnl' },
    aging: { title: 'Receivables Aging', api: '/api/reports/aging' },
  }

  var REPORT_RENDERERS = {
    overview: 'renderReportOverview',
    pnl: 'renderReportPnl',
    aging: 'renderReportAging',
  }

  var state = {
    user: null,
    serverUrl: '',
    offline: false,
    route: null,
    detailName: null,
    currentProjectId: null,
    cache: {
      dashboard: null,
      projects: null,
      finance: null,
      contacts: null,
      properties: null,
      inventory: null,
      procurement: null,
      fleet: null,
      assets: null,
      employees: null,
      installments: null,
      reports: null,
    },
  }

  var qr = {
    stream: null,
    raf: null,
    scanning: false,
    lastErrorAt: 0,
  }

  var toastTimer = null

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
    try {
      API.configure(storeGet(STORE.serverUrl) || '')
      API.setToken(storeGet(STORE.token) || '')
      try { state.user = JSON.parse(storeGet(STORE.user) || 'null') } catch (e) { state.user = null }
      state.serverUrl = API.getBaseUrl()
      state.cache.dashboard = cacheGet(STORE.dashboard)
      state.cache.projects = cacheGet(STORE.projects)
      state.cache.finance = cacheGet(STORE.finance)
      state.cache.contacts = cacheGet(STORE.contacts)
      state.cache.properties = cacheGet(STORE.properties)
      state.cache.inventory = cacheGet(STORE.inventory)
      state.cache.procurement = cacheGet(STORE.procurement)
      state.cache.fleet = cacheGet(STORE.fleet)
      state.cache.assets = cacheGet(STORE.assets)
      state.cache.employees = cacheGet(STORE.employees)
      state.cache.installments = cacheGet(STORE.installments)
      state.cache.reports = cacheGet(STORE.reports)

      if (API.getToken() && state.user && state.serverUrl) {
        enterApp()
      } else {
        showLogin()
      }
    } catch (err) {
      showLogin()
    } finally {
      hideLoader()
    }
  }

  function enterApp() {
    closeQrScanner()
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
    var emailInput = $('#login-email')
    if (emailInput && !emailInput.value) {
      emailInput.value = storeGet(STORE.loginEmail) || ''
    }
    var passInput = $('#login-password')
    if (passInput && !passInput.value) {
      passInput.value = storeGet(STORE.loginPassword) || ''
    }
    hideLoading()
    closeModal()
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

  function hideLoader() {
    var el = $('#boot-loader')
    if (!el || el.classList.contains('hide')) return
    el.classList.add('hide')
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el)
    }, 320)
  }

  function toast(message) {
    var el = $('#toast')
    if (!el) return
    el.textContent = message
    el.classList.remove('hidden')
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () {
      el.classList.add('hidden')
    }, 2600)
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
      storeSet(STORE.loginEmail, email)
      storeSet(STORE.loginPassword, password)
      API.configure(url)
      API.setToken(res.token)
      state.user = res.user
      state.serverUrl = url

      hideLoading()
      showLoginError('')
      enterApp()
    } catch (err) {
      hideLoading()
      // Primary address failed - retry with the fallback (e.g. Tailscale -> LAN)
      if (fallbackUrl && fallbackUrl !== serverUrl) {
        return pairWithCode(fallbackUrl, token, fromScanner, null)
      }
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

  /* ------------------------------ QR pairing ------------------------------ */

  function parsePairPayload(text) {
    if (!text) return null
    var obj = null
    try { obj = JSON.parse(String(text).trim()) } catch (e) { return null }
    if (!obj || obj.v !== 1 || !obj.s || !obj.k) return null
    return { s: String(obj.s).trim(), s2: obj.s2 ? String(obj.s2).trim() : '', k: String(obj.k).trim() }
  }

  function openQrScanner() {
    $('#qr-overlay').classList.remove('hidden')
    showQrStatus('Starting camera…')
    $('#qr-manual-box').classList.add('hidden')
    startCamera()
  }

  function closeQrScanner() {
    stopCamera()
    $('#qr-overlay').classList.add('hidden')
  }

  function showQrStatus(text, isError) {
    var el = $('#qr-status')
    if (!el) return
    el.textContent = text
    el.className = 'qr-status' + (isError ? ' err' : '')
  }

  function stopTrackStream(stream) {
    if (!stream) return
    var tracks = stream.getTracks()
    for (var i = 0; i < tracks.length; i++) tracks[i].stop()
  }

  function startCamera() {
    if (qr.stream) return
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showQrStatus('Camera is not available on this device. Use manual entry below.', true)
      $('#qr-manual-box').classList.remove('hidden')
      return
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      .then(function (stream) {
        if (qr.stream || $('#qr-overlay').classList.contains('hidden')) {
          stopTrackStream(stream)
          return
        }
        qr.stream = stream
        var video = $('#qr-video')
        video.srcObject = stream
        video.setAttribute('playsinline', '')
        video.play().catch(function () {})
        showQrStatus('Point the camera at the QR code…')
        startDecodeLoop()
      })
      .catch(function (err) {
        var name = err && err.name ? err.name : ''
        var denied = name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError'
        showQrStatus(
          denied
            ? 'Camera permission denied. Use the pairing code below instead.'
            : 'Could not start the camera. Use the pairing code below instead.',
          true
        )
        $('#qr-manual-box').classList.remove('hidden')
      })
  }

  function stopCamera() {
    qr.scanning = false
    if (qr.raf) {
      cancelAnimationFrame(qr.raf)
      qr.raf = null
    }
    if (qr.stream) {
      var tracks = qr.stream.getTracks()
      for (var i = 0; i < tracks.length; i++) tracks[i].stop()
      qr.stream = null
    }
    var video = $('#qr-video')
    if (video) video.srcObject = null
  }

  function startDecodeLoop() {
    if (qr.scanning) return
    qr.scanning = true
    var video = $('#qr-video')
    var canvas = $('#qr-canvas')
    var ctx = canvas.getContext('2d')
    var last = 0

    function tick(now) {
      if (!qr.scanning) return
      if (now - last >= 120) {
        last = now
        if (video.readyState >= video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          try {
            var img = ctx.getImageData(0, 0, canvas.width, canvas.height)
            var result = jsQR(img.data, canvas.width, canvas.height, { inversionAttempts: 'dontInvert' })
            if (result && result.data) {
              var parsed = parsePairPayload(result.data)
              if (parsed) {
                stopCamera()
                pairWithCode(parsed.s, parsed.k, true, parsed.s2)
                return
              }
              var nowMs = Date.now()
              if (nowMs - qr.lastErrorAt > 1800) {
                qr.lastErrorAt = nowMs
                showQrStatus('Not a BuildProp code. Keep scanning…')
              }
            }
          } catch (e) {
            // frame read failure — keep scanning
          }
        }
      }
      qr.raf = requestAnimationFrame(tick)
    }
    qr.raf = requestAnimationFrame(tick)
  }

  async function pairWithCode(serverUrl, token, fromScanner, fallbackUrl) {
    if (!serverUrl || !token) {
      showQrStatus('That does not look like a valid BuildProp pairing code.', true)
      return
    }
    showLoading('Linking…')
    API.configure(serverUrl)
    try {
      var res = await API.apiFetch('/api/mobile/pair/confirm', {
        method: 'POST',
        body: { token: token },
      })
      if (!res || !res.token) throw new Error('Server did not return an auth token.')

      storeSet(STORE.serverUrl, serverUrl)
      storeSet(STORE.token, res.token)
      storeSet(STORE.user, JSON.stringify(res.user))
      if (res.user && res.user.email) storeSet(STORE.loginEmail, res.user.email)
      API.setToken(res.token)
      state.user = res.user
      state.serverUrl = serverUrl

      hideLoading()
      if (fromScanner) closeQrScanner()
      $('#login-error').textContent = ''
      enterApp()
    } catch (err) {
      hideLoading()
      var msg = '❌ ' + friendlyMessage(err)
      if (fromScanner) {
        showQrStatus(msg + ' Try again with a fresh QR code, or enter the code manually.', true)
        $('#qr-manual-box').classList.remove('hidden')
      } else {
        showLoginError(msg)
      }
    }
  }

  function onManualCodeEntry() {
    var text = $('#manual-code-input').value.trim()
    var parsed = parsePairPayload(text)
    if (!parsed) {
      showLoginError('That does not look like a valid BuildProp pairing code.')
      return
    }
    pairWithCode(parsed.s, parsed.k, false, parsed.s2)
  }

  function onQrManualCodeEntry() {
    var text = $('#qr-manual-input').value.trim()
    var parsed = parsePairPayload(text)
    if (!parsed) {
      showQrStatus('That does not look like a valid BuildProp pairing code.', true)
      return
    }
    stopCamera()
    pairWithCode(parsed.s, parsed.k, true, parsed.s2)
  }

  /* ------------------------------ routing ------------------------------ */

  function parseRoute() {
    var raw = (location.hash || '#/home').replace(/^#\/?/, '')
    var parts = raw.split('/').filter(Boolean)
    if (parts[0] === 'projects' && parts[1]) {
      return { name: 'project', tab: 'projects', id: decodeURIComponent(parts[1]) }
    }
    if (parts[0] === 'm' && parts[1]) {
      return { name: 'module', tab: 'more', module: parts[1] }
    }
    if (parts[0] === 'report' && parts[1]) {
      return { name: 'report', tab: 'more', report: parts[1] }
    }
    if (['home', 'projects', 'finance', 'contacts', 'alerts', 'settings', 'more'].indexOf(parts[0]) !== -1) {
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
    var pushed = route.name === 'project' || route.name === 'alerts' || route.name === 'module' || route.name === 'report'

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
      case 'contacts':
        renderContactsScreen()
        break
      case 'alerts':
        renderAlerts()
        break
      case 'settings':
        renderSettingsScreen()
        break
      case 'more':
        renderMoreScreen()
        break
      case 'module':
        renderModuleScreen(route.module)
        break
      case 'report':
        renderReportScreen(route.report)
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

  function setHeaderTitle(text) {
    var el = $('#header-title')
    if (!el) return
    var name = el.querySelector('.head-name')
    if (name) name.textContent = text
    else el.textContent = text
  }

  function updateHeader(route) {
    var back = $('#btn-back')
    var refresh = $('#btn-refresh')
    var bell = $('#btn-alerts')
    var title = $('#header-title')

    var pushed = route.name === 'project' || route.name === 'alerts' || route.name === 'module' || route.name === 'report'
    if (pushed) {
      back.classList.remove('hidden')
      refresh.classList.toggle('hidden', !(route.name === 'module' || route.name === 'report'))
      bell.classList.add('hidden')
      if (route.name === 'alerts') setHeaderTitle('Alerts')
      else if (route.name === 'project') setHeaderTitle(state.detailName || 'Project')
      else if (route.name === 'module') setHeaderTitle((MODULE_META[route.module] && MODULE_META[route.module].title) || S.statusLabel(route.module))
      else setHeaderTitle((REPORT_META[route.report] && REPORT_META[route.report].title) || 'Report')
    } else {
      back.classList.add('hidden')
      refresh.classList.toggle('hidden', !(route.name === 'home' || route.name === 'projects' || route.name === 'finance' || route.name === 'contacts' || route.name === 'more'))
      bell.classList.toggle('hidden', route.name !== 'home')
      setHeaderTitle(ROUTE_TITLES[route.name] || 'BuildProp')
    }
    updateAlertBadge()
  }

  function updateAlertBadge() {
    var badge = $('#alert-count')
    if (!badge) return
    var count = deriveAlerts().length
    badge.textContent = count > 99 ? '99+' : count
    badge.classList.toggle('hidden', count === 0)
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

  /* ------------------------------ modal ------------------------------ */

  function openModal(title, html) {
    $('#modal-title').textContent = title
    $('#modal-body').innerHTML = html
    $('#modal-overlay').classList.remove('hidden')
    document.body.classList.add('modal-open')
    var form = $('#modal-body form')
    if (form) {
      var kind = form.getAttribute('data-form')
      if (kind === 'invoice') recomputeInvoiceTotals()
      if (kind === 'procurement') recomputePoTotals()
      form.addEventListener('submit', onFormSubmit)
    }
  }

  function closeModal() {
    $('#modal-overlay').classList.add('hidden')
    $('#modal-body').innerHTML = ''
    document.body.classList.remove('modal-open')
  }

  /* ------------------------------ data loaders ------------------------------ */

  function routeKey() {
    var r = state.route
    if (!r) return ''
    if (r.name === 'project' && r.id) return 'project:' + r.id
    if (r.name === 'module' && r.module) return 'module:' + r.module
    if (r.name === 'report' && r.report) return 'report:' + r.report
    return r.name
  }

  function staleRoute(expected) {
    return routeKey() !== expected
  }

  async function loadContacts() {
    if (state.cache.contacts) return state.cache.contacts
    try {
      var data = await API.apiFetch('/api/contacts')
      state.cache.contacts = data
      storeSet(STORE.contacts, JSON.stringify(data))
      return data
    } catch (err) {
      if (handleSessionError(err)) throw err
      if (state.cache.contacts) return state.cache.contacts
      throw err
    }
  }

  async function loadFinance() {
    if (state.cache.finance) return state.cache.finance
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
      return finance
    } catch (err) {
      if (handleSessionError(err)) throw err
      if (state.cache.finance) return state.cache.finance
      throw err
    }
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
      sc.innerHTML = S.renderHome({ dashboard: data, user: state.user, offline: false, alerts: deriveAlerts() })
    } catch (err) {
      if (staleRoute(expected)) return
      if (handleSessionError(err)) return
      state.offline = true
      if (state.cache.dashboard) {
        sc.innerHTML = S.renderHome({ dashboard: state.cache.dashboard, user: state.user, offline: true, alerts: deriveAlerts() })
      } else {
        sc.innerHTML = errorScreen(err)
      }
    }
    updateAlertBadge()
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
    state.currentProjectId = id
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
      if (staleRoute(expected)) return
      if (handleSessionError(err)) return
      state.offline = true
      if (state.cache.finance) {
        sc.innerHTML = S.renderFinance(state.cache.finance, { offline: true })
      } else {
        sc.innerHTML = errorScreen(err)
      }
    }
  }

  async function renderContactsScreen() {
    var sc = $('#screen-container')
    var expected = routeKey()
    sc.innerHTML = loadingScreen()
    try {
      var contacts = await API.apiFetch('/api/contacts')
      if (staleRoute(expected)) return
      state.cache.contacts = contacts
      storeSet(STORE.contacts, JSON.stringify(contacts))
      state.offline = false
      sc.innerHTML = S.renderContacts(contacts, { offline: false })
    } catch (err) {
      if (staleRoute(expected)) return
      if (handleSessionError(err)) return
      state.offline = true
      if (state.cache.contacts) {
        sc.innerHTML = S.renderContacts(state.cache.contacts, { offline: true })
      } else {
        sc.innerHTML = errorScreen(err)
      }
    }
  }

  function renderMoreScreen() {
    $('#screen-container').innerHTML = S.renderMore()
  }

  function moduleCacheKey(module) {
    return STORE[module] || ''
  }

  async function renderModuleScreen(module) {
    var meta = MODULE_META[module]
    if (!meta) {
      $('#screen-container').innerHTML = S.renderModuleUnavailable(module)
      return
    }
    if (!meta.api) {
      if (module === 'reports') {
        $('#screen-container').innerHTML = S.renderReportsMenu()
      } else {
        $('#screen-container').innerHTML = S.renderModuleUnavailable(module)
      }
      return
    }

    var sc = $('#screen-container')
    var expected = routeKey()
    sc.innerHTML = loadingScreen()
    try {
      var data = await API.apiFetch(meta.api)
      if (staleRoute(expected)) return
      state.cache[module] = data
      storeSet(moduleCacheKey(module), JSON.stringify(data))
      state.offline = false
      sc.innerHTML = S[MODULE_RENDERERS[module]](data, { offline: false })
    } catch (err) {
      if (staleRoute(expected)) return
      if (handleSessionError(err)) return
      state.offline = true
      if (state.cache[module]) {
        sc.innerHTML = S[MODULE_RENDERERS[module]](state.cache[module], { offline: true })
      } else {
        sc.innerHTML = errorScreen(err)
      }
    }
  }

  async function renderReportScreen(report) {
    var meta = REPORT_META[report]
    if (!meta) {
      navigate('/m/reports')
      return
    }
    var sc = $('#screen-container')
    var expected = routeKey()
    sc.innerHTML = loadingScreen()
    try {
      var data = await API.apiFetch(meta.api)
      if (staleRoute(expected)) return
      state.cache.reports = data
      storeSet(STORE.reports, JSON.stringify(data))
      state.offline = false
      sc.innerHTML = S[REPORT_RENDERERS[report]](data, { offline: false })
    } catch (err) {
      if (staleRoute(expected)) return
      if (handleSessionError(err)) return
      state.offline = true
      if (state.cache.reports) {
        sc.innerHTML = S[REPORT_RENDERERS[report]](state.cache.reports, { offline: true })
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
    updateAlertBadge()
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

  /* ------------------------------ form submission ------------------------------ */

  function fieldVal(id) {
    var el = document.getElementById(id)
    return el ? el.value : ''
  }

  function numOrUndef(str) {
    var t = String(str || '').trim()
    if (t === '') return undefined
    return Number(t)
  }

  async function onFormSubmit(e) {
    e.preventDefault()
    var form = e.target
    var kind = form.getAttribute('data-form')
    if (kind === 'project') submitProject(form)
    else if (kind === 'invoice') submitInvoice(form)
    else if (kind === 'payment') submitPayment(form)
    else if (kind === 'contact') submitContact(form)
    else if (kind === 'task') submitTask(form)
    else if (kind === 'property') submitProperty(form)
    else if (kind === 'inventory') submitInventory(form)
    else if (kind === 'inventory-adjust') submitInventoryAdjust(form)
    else if (kind === 'procurement') submitProcurement(form)
    else if (kind === 'procurement-edit') submitProcurementEdit(form)
    else if (kind === 'fleet') submitFleet(form)
    else if (kind === 'asset') submitAsset(form)
    else if (kind === 'employee-new') submitEmployeeNew(form)
    else if (kind === 'employee') submitEmployee(form)
    else if (kind === 'installment-pay') submitInstallmentPay(form)
  }

  async function submitAndRefresh(path, method, body, successMsg, afterRoute) {
    showLoading('Saving…')
    try {
      await API.apiFetch(path, { method: method, body: body })
      hideLoading()
      closeModal()
      toast('✅ ' + successMsg)
      await refreshAllData()
      if (afterRoute) navigate(afterRoute)
      else renderRoute()
    } catch (err) {
      hideLoading()
      if (handleSessionError(err)) {
        closeModal()
        return
      }
      toast('❌ ' + friendlyMessage(err))
    }
  }

  function submitProject(form) {
    var name = fieldVal('f-name').trim()
    var code = fieldVal('f-code').trim()
    if (!name || !code) {
      toast('Project name and code are required.')
      return
    }
    var id = form.getAttribute('data-id')
    var body = {
      name: name,
      code: code,
      description: fieldVal('f-description'),
      projectType: fieldVal('f-type'),
      status: fieldVal('f-status'),
      priority: fieldVal('f-priority'),
      startDate: fieldVal('f-start') || undefined,
      endDate: fieldVal('f-end') || undefined,
      estimatedBudget: numOrUndef(fieldVal('f-budget')),
      location: fieldVal('f-location'),
    }
    submitAndRefresh(
      id ? '/api/projects/' + encodeURIComponent(id) : '/api/projects',
      id ? 'PUT' : 'POST',
      body,
      id ? 'Project updated' : 'Project created',
      id ? '/projects/' + encodeURIComponent(id) : '/projects'
    )
  }

  function readInvoiceItems(form) {
    var rows = form.querySelectorAll('.inv-item')
    var items = []
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      var desc = (row.querySelector('.f-item-desc').value || '').trim()
      var qty = num(row.querySelector('.f-item-qty').value)
      var price = num(row.querySelector('.f-item-price').value)
      if (!desc || qty <= 0 || price <= 0) continue
      items.push({
        description: desc,
        quantity: qty,
        unitPrice: price,
      })
    }
    return items
  }

  function submitInvoice(form) {
    var issueDate = fieldVal('f-inv-issue')
    var dueDate = fieldVal('f-inv-due')
    if (!issueDate || !dueDate) {
      toast('Issue date and due date are required.')
      return
    }
    var items = readInvoiceItems(form)
    if (!items.length) {
      toast('Add at least one line item with a description and a unit price.')
      return
    }
    var subtotal = items.reduce(function (sum, it) { return sum + num(it.quantity) * num(it.unitPrice) }, 0)
    var taxAmount = S.round2(subtotal * 0.15)
    var totalAmount = S.round2(subtotal + taxAmount)

    var bodyItems = items.map(function (it) {
      return {
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice,
        amount: S.round2(it.quantity * it.unitPrice),
      }
    })

    var body = {
      type: fieldVal('f-inv-type'),
      contactId: fieldVal('f-inv-customer') || null,
      issueDate: issueDate,
      dueDate: dueDate,
      subtotal: S.round2(subtotal),
      taxAmount: taxAmount,
      totalAmount: totalAmount,
      items: bodyItems,
    }
    submitAndRefresh('/api/invoices', 'POST', body, 'Invoice created', '/finance')
  }

  function submitPayment(form) {
    var amount = num(fieldVal('f-pay-amount'))
    var paymentDate = fieldVal('f-pay-date')
    if (!(amount > 0)) {
      toast('Enter a valid payment amount.')
      return
    }
    if (!paymentDate) {
      toast('Payment date is required.')
      return
    }
    var body = {
      type: fieldVal('f-pay-type'),
      contactId: fieldVal('f-pay-customer') || null,
      invoiceId: fieldVal('f-pay-invoice') || null,
      amount: amount,
      paymentMethod: fieldVal('f-pay-method'),
      paymentDate: paymentDate,
    }
    submitAndRefresh('/api/payments', 'POST', body, 'Payment recorded', '/finance')
  }

  function submitContact(form) {
    var firstName = fieldVal('f-first').trim()
    var lastName = fieldVal('f-last').trim()
    if (!firstName || !lastName) {
      toast('First and last name are required.')
      return
    }
    var id = form.getAttribute('data-id')
    var body = {
      type: fieldVal('f-contact-type'),
      firstName: firstName,
      lastName: lastName,
      email: fieldVal('f-email'),
      phone: fieldVal('f-phone'),
      company: fieldVal('f-company'),
      address: fieldVal('f-address'),
      notes: fieldVal('f-notes'),
      source: fieldVal('f-source'),
      leadStatus: fieldVal('f-lead-status'),
    }
    submitAndRefresh(
      id ? '/api/contacts/' + encodeURIComponent(id) : '/api/contacts',
      id ? 'PUT' : 'POST',
      body,
      id ? 'Contact updated' : 'Contact added',
      '/contacts'
    )
  }

  function submitTask(form) {
    var title = fieldVal('f-task-title').trim()
    var projectId = form.getAttribute('data-project-id')
    if (!title) {
      toast('Task title is required.')
      return
    }
    var body = {
      projectId: projectId,
      title: title,
      description: fieldVal('f-task-desc'),
      priority: fieldVal('f-task-priority'),
      dueDate: fieldVal('f-task-due') || undefined,
      status: 'todo',
    }
    submitAndRefresh('/api/tasks', 'POST', body, 'Task added', projectId ? '/projects/' + encodeURIComponent(projectId) : '/projects')
  }

  function findInModuleCache(module, id) {
    var data = state.cache[module]
    if (!data) return null
    var list = module === 'procurement' ? data.purchaseOrders : (Array.isArray(data) ? data : null)
    if (!list) return null
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i]
    }
    return null
  }

  function submitProperty(form) {
    var name = fieldVal('f-name').trim()
    var price = num(fieldVal('f-price'))
    if (!name) {
      toast('Property name is required.')
      return
    }
    if (!(price > 0)) {
      toast('Enter a valid price.')
      return
    }
    var id = form.getAttribute('data-id')
    var body = {
      name: name,
      description: fieldVal('f-description'),
      propertyType: fieldVal('f-prop-type'),
      status: fieldVal('f-prop-status'),
      price: price,
      rentalPrice: numOrUndef(fieldVal('f-rental')),
      areaSqft: numOrUndef(fieldVal('f-area')),
      bedrooms: numOrUndef(fieldVal('f-bed')),
      bathrooms: numOrUndef(fieldVal('f-bath')),
      city: fieldVal('f-city'),
      state: fieldVal('f-state'),
      address: fieldVal('f-address'),
    }
    submitAndRefresh(
      id ? '/api/properties/' + encodeURIComponent(id) : '/api/properties',
      id ? 'PUT' : 'POST',
      body,
      id ? 'Property updated' : 'Property created'
    )
  }

  function submitInventory(form) {
    var name = fieldVal('f-inv-name').trim()
    var unit = fieldVal('f-inv-unit').trim()
    if (!name || !unit) {
      toast('Item name and unit of measure are required.')
      return
    }
    var id = form.getAttribute('data-id')
    var body = {
      name: name,
      unitOfMeasure: unit,
      description: fieldVal('f-inv-desc'),
      categoryId: fieldVal('f-inv-cat') || undefined,
      currentStock: numOrUndef(fieldVal('f-inv-stock')),
      minStock: numOrUndef(fieldVal('f-inv-min')),
      maxStock: numOrUndef(fieldVal('f-inv-max')),
      unitCost: numOrUndef(fieldVal('f-inv-cost')),
    }
    submitAndRefresh(
      id ? '/api/inventory/' + encodeURIComponent(id) : '/api/inventory',
      id ? 'PUT' : 'POST',
      body,
      id ? 'Inventory item updated' : 'Inventory item added'
    )
  }

  function submitInventoryAdjust(form) {
    var id = form.getAttribute('data-id')
    var stock = num(fieldVal('f-adj-stock'))
    if (stock < 0) {
      toast('Stock quantity cannot be negative.')
      return
    }
    submitAndRefresh('/api/inventory/' + encodeURIComponent(id), 'PUT', { currentStock: stock }, 'Stock adjusted')
  }

  function readPoItems(form) {
    var rows = form.querySelectorAll('.po-item')
    var items = []
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i]
      var desc = (row.querySelector('.po-item-desc').value || '').trim()
      if (!desc) continue
      var qty = num(row.querySelector('.po-item-qty').value)
      var price = num(row.querySelector('.po-item-price').value)
      items.push({
        description: desc,
        quantity: qty,
        unitPrice: price,
        amount: S.round2(qty * price),
      })
    }
    return items
  }

  function submitProcurement(form) {
    var supplierId = fieldVal('f-po-supplier')
    var items = readPoItems(form)
    if (!supplierId) {
      toast('Select a supplier.')
      return
    }
    if (!items.length) {
      toast('Add at least one line item with a description.')
      return
    }
    var total = items.reduce(function (sum, it) { return sum + num(it.amount) }, 0)
    var body = {
      supplierId: supplierId,
      orderDate: fieldVal('f-po-order') || undefined,
      expectedDelivery: fieldVal('f-po-delivery') || undefined,
      totalAmount: S.round2(total),
      items: items,
    }
    submitAndRefresh('/api/procurement', 'POST', body, 'Purchase order created')
  }

  function submitProcurementEdit(form) {
    var id = form.getAttribute('data-id')
    var body = {
      supplierId: fieldVal('f-po-supplier') || undefined,
      orderDate: fieldVal('f-po-order') || undefined,
      expectedDelivery: fieldVal('f-po-delivery') || undefined,
    }
    var status = fieldVal('f-po-status')
    if (status) body.status = status
    submitAndRefresh('/api/procurement/' + encodeURIComponent(id), 'PUT', body, 'Purchase order updated')
  }

  function submitFleet(form) {
    var name = fieldVal('f-fleet-name').trim()
    var plate = fieldVal('f-fleet-plate').trim()
    if (!name || !plate) {
      toast('Vehicle name and license plate are required.')
      return
    }
    var id = form.getAttribute('data-id')
    var body = {
      name: name,
      licensePlate: plate,
      make: fieldVal('f-fleet-make'),
      model: fieldVal('f-fleet-model'),
      year: numOrUndef(fieldVal('f-fleet-year')),
      status: fieldVal('f-fleet-status'),
      fuelType: fieldVal('f-fleet-fuel'),
      mileage: numOrUndef(fieldVal('f-fleet-mileage')),
    }
    submitAndRefresh(
      id ? '/api/fleet/' + encodeURIComponent(id) : '/api/fleet',
      id ? 'PUT' : 'POST',
      body,
      id ? 'Vehicle updated' : 'Vehicle added'
    )
  }

  function submitAsset(form) {
    var name = fieldVal('f-asset-name').trim()
    if (!name) {
      toast('Asset name is required.')
      return
    }
    var id = form.getAttribute('data-id')
    var body = {
      name: name,
      category: fieldVal('f-asset-cat'),
      status: fieldVal('f-asset-status'),
      purchaseDate: fieldVal('f-asset-pdate') || undefined,
      purchasePrice: numOrUndef(fieldVal('f-asset-pprice')),
      currentValue: numOrUndef(fieldVal('f-asset-cvalue')),
      location: fieldVal('f-asset-loc'),
      insuranceExpiry: fieldVal('f-asset-iexp') || undefined,
    }
    submitAndRefresh(
      id ? '/api/assets/' + encodeURIComponent(id) : '/api/assets',
      id ? 'PUT' : 'POST',
      body,
      id ? 'Asset updated' : 'Asset added'
    )
  }

  function submitEmployeeNew(form) {
    var first = fieldVal('f-emp-first').trim()
    var last = fieldVal('f-emp-last').trim()
    var dept = fieldVal('f-emp-dept')
    if (!first || !last) {
      toast('First and last name are required.')
      return
    }
    if (!dept) {
      toast('Select a department.')
      return
    }
    var body = {
      firstName: first,
      lastName: last,
      designation: fieldVal('f-emp-designation') || null,
      departmentId: dept,
      employmentType: fieldVal('f-emp-type'),
      salary: num(fieldVal('f-emp-salary')),
    }
    submitAndRefresh('/api/hr/employee', 'POST', body, 'Employee added')
  }

  function submitEmployee(form) {
    var id = form.getAttribute('data-id')
    var body = {
      employeeId: fieldVal('f-emp-id'),
      designation: fieldVal('f-emp-designation'),
      departmentId: fieldVal('f-emp-dept'),
      employmentType: fieldVal('f-emp-type'),
      dateOfJoining: fieldVal('f-emp-join') || undefined,
      salary: num(fieldVal('f-emp-salary')),
      status: fieldVal('f-emp-status'),
    }
    if (!body.employeeId || !body.designation || !body.departmentId || !body.dateOfJoining) {
      toast('Employee ID, designation, department and join date are required.')
      return
    }
    submitAndRefresh('/api/employees/' + encodeURIComponent(id), 'PUT', body, 'Employee updated')
  }

  function submitInstallmentPay(form) {
    var planId = form.getAttribute('data-plan-id')
    var installmentId = fieldVal('f-inst-id')
    if (!installmentId) {
      toast('Select an installment.')
      return
    }
    var amount = num(fieldVal('f-inst-amount'))
    var body = {
      installmentId: installmentId,
      status: 'paid',
      paidDate: fieldVal('f-inst-date') || undefined,
      notes: fieldVal('f-inst-notes'),
    }
    if (amount > 0) body.paidAmount = amount
    submitAndRefresh('/api/installments/' + encodeURIComponent(planId), 'PUT', body, 'Payment recorded')
  }

  async function markTaskComplete(id) {
    showLoading('Updating…')
    try {
      await API.apiFetch('/api/tasks/' + encodeURIComponent(id), { method: 'PUT', body: { status: 'completed' } })
      hideLoading()
      toast('✅ Task completed')
      if (state.currentProjectId) renderProjectDetail(state.currentProjectId)
      refreshAllData()
    } catch (err) {
      hideLoading()
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  async function deleteContact(id) {
    if (!window.confirm('Delete this contact? This cannot be undone.')) return
    showLoading('Deleting…')
    try {
      await API.apiFetch('/api/contacts/' + encodeURIComponent(id), { method: 'DELETE' })
      hideLoading()
      toast('✅ Contact deleted')
      await refreshAllData()
      if (state.route && state.route.name === 'contacts') renderContactsScreen()
    } catch (err) {
      hideLoading()
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  /* ------------------------------ module loaders ------------------------------ */

  async function loadInventory() {
    if (state.cache.inventory) return state.cache.inventory
    try {
      var data = await API.apiFetch('/api/inventory')
      state.cache.inventory = data
      storeSet(STORE.inventory, JSON.stringify(data))
      return data
    } catch (err) {
      if (handleSessionError(err)) throw err
      if (state.cache.inventory) return state.cache.inventory
      throw err
    }
  }

  async function loadProcurement() {
    if (state.cache.procurement) return state.cache.procurement
    try {
      var data = await API.apiFetch('/api/procurement')
      state.cache.procurement = data
      storeSet(STORE.procurement, JSON.stringify(data))
      return data
    } catch (err) {
      if (handleSessionError(err)) throw err
      if (state.cache.procurement) return state.cache.procurement
      throw err
    }
  }

  async function loadHr() {
    if (state.cache.employees) return state.cache.employees
    try {
      var data = await API.apiFetch('/api/hr')
      state.cache.employees = data
      storeSet(STORE.employees, JSON.stringify(data))
      return data
    } catch (err) {
      if (handleSessionError(err)) throw err
      if (state.cache.employees) return state.cache.employees
      throw err
    }
  }

  /* ------------------------------ module deletes ------------------------------ */

  async function deleteModuleItem(module, path, id) {
    if (!window.confirm('Delete this item? This cannot be undone.')) return
    showLoading('Deleting…')
    try {
      await API.apiFetch(path + '/' + encodeURIComponent(id), { method: 'DELETE' })
      hideLoading()
      toast('✅ Deleted')
      await refreshAllData()
      if (state.route && state.route.name === 'module' && state.route.module === module) {
        renderModuleScreen(module)
      }
    } catch (err) {
      hideLoading()
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  function deleteProperty(id) { deleteModuleItem('properties', '/api/properties', id) }
  function deleteInventory(id) { deleteModuleItem('inventory', '/api/inventory', id) }
  function deleteProcurement(id) { deleteModuleItem('procurement', '/api/procurement', id) }
  function deleteFleet(id) { deleteModuleItem('fleet', '/api/fleet', id) }
  function deleteAsset(id) { deleteModuleItem('assets', '/api/assets', id) }
  function deleteEmployee(id) { deleteModuleItem('employees', '/api/employees', id) }

  /* ------------------------------ form openers ------------------------------ */

  async function openPropertyForm(propertyId) {
    if (!propertyId) {
      openModal('New Property', S.renderPropertyForm())
      return
    }
    try {
      var p = await API.apiFetch('/api/properties/' + encodeURIComponent(propertyId))
      openModal('Edit Property', S.renderPropertyForm(p))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  async function openInventoryForm(itemId) {
    var categories = []
    try {
      var list = await loadInventory()
      categories = S.inventoryCategories(list)
    } catch (err) {
      if (handleSessionError(err)) return
    }
    if (!itemId) {
      openModal('Add Inventory Item', S.renderInventoryForm(null, categories))
      return
    }
    try {
      var item = await API.apiFetch('/api/inventory/' + encodeURIComponent(itemId))
      openModal('Edit Inventory Item', S.renderInventoryForm(item, categories))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  async function openInventoryAdjust(itemId) {
    try {
      var item = await API.apiFetch('/api/inventory/' + encodeURIComponent(itemId))
      openModal('Adjust Stock', S.renderInventoryAdjustForm(item))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  async function openProcurementForm(poId) {
    var suppliers = []
    try {
      var payload = await loadProcurement()
      suppliers = payload.suppliers || []
    } catch (err) {
      if (handleSessionError(err)) return
    }
    if (!poId) {
      openModal('New Purchase Order', S.renderProcurementCreateForm(suppliers))
      return
    }
    try {
      var po = await API.apiFetch('/api/procurement/' + encodeURIComponent(poId))
      openModal('Edit Purchase Order', S.renderProcurementEditForm(suppliers, po))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  function viewProcurementDetail(poId) {
    var po = findInModuleCache('procurement', poId)
    if (!po) {
      toast('Could not find that purchase order.')
      return
    }
    openModal('Purchase Order', S.renderProcurementDetail(po))
  }

  async function openFleetForm(vehicleId) {
    if (!vehicleId) {
      openModal('Add Vehicle', S.renderFleetForm())
      return
    }
    try {
      var v = await API.apiFetch('/api/fleet/' + encodeURIComponent(vehicleId))
      openModal('Edit Vehicle', S.renderFleetForm(v))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  async function openAssetForm(assetId) {
    if (!assetId) {
      openModal('Add Asset', S.renderAssetForm())
      return
    }
    try {
      var a = await API.apiFetch('/api/assets/' + encodeURIComponent(assetId))
      openModal('Edit Asset', S.renderAssetForm(a))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  async function openEmployeeForm(employeeId) {
    var departments = []
    try {
      var hr = await loadHr()
      departments = hr.departments || []
    } catch (err) {
      if (handleSessionError(err)) return
    }
    if (!employeeId) {
      openModal('Add Employee', S.renderEmployeeForm(departments, null))
      return
    }
    try {
      var e = await API.apiFetch('/api/employees/' + encodeURIComponent(employeeId))
      openModal('Edit Employee', S.renderEmployeeForm(departments, e))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  function openInstallmentPay(planId) {
    var plan = findInModuleCache('installments', planId)
    if (!plan) {
      toast('Could not find that installment plan.')
      return
    }
    openModal('Record Payment', S.renderInstallmentPayForm(plan))
  }

  /* ------------------------------ form openers ------------------------------ */

  async function openProjectForm(projectId) {
    if (!projectId) {
      openModal('New Project', S.renderProjectForm())
      return
    }
    try {
      var project = await API.apiFetch('/api/projects/' + encodeURIComponent(projectId))
      openModal('Edit Project', S.renderProjectForm(project))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  async function openInvoiceForm() {
    try {
      var contacts = await loadContacts()
      openModal('New Invoice', S.renderInvoiceForm(contacts))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  async function openPaymentForm() {
    try {
      var contacts = await loadContacts()
      var finance = await loadFinance()
      openModal('Record Payment', S.renderPaymentForm(contacts, finance.invoices))
    } catch (err) {
      if (handleSessionError(err)) return
      toast('❌ ' + friendlyMessage(err))
    }
  }

  async function openContactForm(contactId) {
    if (!contactId) {
      openModal('Add Contact', S.renderContactForm())
      return
    }
    var contact = null
    if (state.cache.contacts) {
      for (var i = 0; i < state.cache.contacts.length; i++) {
        if (state.cache.contacts[i].id === contactId) { contact = state.cache.contacts[i]; break }
      }
    }
    if (!contact) {
      try {
        contact = await API.apiFetch('/api/contacts/' + encodeURIComponent(contactId))
      } catch (err) {
        if (handleSessionError(err)) return
        toast('❌ ' + friendlyMessage(err))
        return
      }
    }
    openModal('Edit Contact', S.renderContactForm(contact))
  }

  function openTaskForm(projectId) {
    openModal('Add Task', S.renderTaskForm(projectId))
  }

  /* ------------------------------ invoice items (modal) ------------------------------ */

  function recomputeInvoiceTotals() {
    var container = document.getElementById('inv-items')
    if (!container) return
    var rows = container.querySelectorAll('.inv-item')
    for (var i = 0; i < rows.length; i++) {
      var rm = rows[i].querySelector('.remove-item')
      if (rm) rm.classList.toggle('hidden', rows.length <= 1)
    }
    var subtotal = 0
    rows.forEach(function (row) {
      var qty = num(row.querySelector('.f-item-qty').value)
      var price = num(row.querySelector('.f-item-price').value)
      subtotal += qty * price
    })
    var tax = S.round2(subtotal * 0.15)
    var total = S.round2(subtotal + tax)
    var totals = document.getElementById('inv-totals')
    if (totals) {
      totals.innerHTML =
        'Subtotal: ' + S.formatCurrency(subtotal) +
        ' &nbsp;·&nbsp; VAT 15%: ' + S.formatCurrency(tax) +
        ' &nbsp;·&nbsp; <b>Total: ' + S.formatCurrency(total) + '</b>'
    }
  }

  function addInvoiceItem() {
    var container = document.getElementById('inv-items')
    if (!container) return
    var row = document.createElement('div')
    row.className = 'inv-item'
    row.innerHTML = S.invoiceItemRowHtml(container.children.length)
    container.appendChild(row)
    recomputeInvoiceTotals()
  }

  function removeInvoiceItem(btn) {
    var row = btn.closest('.inv-item')
    if (!row) return
    var container = document.getElementById('inv-items')
    if (container && container.children.length <= 1) return
    row.parentNode.removeChild(row)
    recomputeInvoiceTotals()
  }

  /* ------------------------------ procurement items (modal) ------------------------------ */

  function recomputePoTotals() {
    var container = document.getElementById('po-items')
    if (!container) return
    var rows = container.querySelectorAll('.po-item')
    for (var i = 0; i < rows.length; i++) {
      var rm = rows[i].querySelector('.remove-po-item')
      if (rm) rm.classList.toggle('hidden', rows.length <= 1)
    }
    var total = 0
    for (var j = 0; j < rows.length; j++) {
      var qty = num(rows[j].querySelector('.po-item-qty').value)
      var price = num(rows[j].querySelector('.po-item-price').value)
      total += qty * price
    }
    var totals = document.getElementById('po-totals')
    if (totals) {
      totals.innerHTML = '<b>Total: ' + S.formatCurrency(total) + '</b>'
    }
  }

  function addPoItem() {
    var container = document.getElementById('po-items')
    if (!container) return
    var row = document.createElement('div')
    row.className = 'inv-item po-item'
    row.innerHTML = S.poItemRowHtml()
    container.appendChild(row)
    recomputePoTotals()
  }

  function removePoItem(btn) {
    var row = btn.closest('.po-item')
    if (!row) return
    var container = document.getElementById('po-items')
    if (container && container.children.length <= 1) return
    row.parentNode.removeChild(row)
    recomputePoTotals()
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
    try {
      var contacts = await API.apiFetch('/api/contacts')
      state.cache.contacts = contacts
      storeSet(STORE.contacts, JSON.stringify(contacts))
    } catch (err) {
      if (handleSessionError(err)) return
      errors.push(err)
    }
    if (errors.length && state.cache.dashboard) {
      state.offline = true
    }
    updateAlertBadge()
  }

  function refreshCurrent() {
    var route = state.route
    if (!route) return Promise.resolve()
    switch (route.name) {
      case 'home':
        return renderHome()
      case 'projects':
        return renderProjectsList()
      case 'project':
        return renderProjectDetail(route.id)
      case 'finance':
        return renderFinance()
      case 'contacts':
        return renderContactsScreen()
      case 'alerts':
        return renderAlerts()
      case 'more':
        renderMoreScreen()
        return Promise.resolve()
      case 'module':
        return renderModuleScreen(route.module)
      case 'report':
        return renderReportScreen(route.report)
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
    return route && (route.name === 'home' || route.name === 'projects' || route.name === 'finance' || route.name === 'contacts' || route.name === 'more' || route.name === 'module' || route.name === 'report')
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
    state.currentProjectId = null
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
    state.currentProjectId = null
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

    // QR linking
    $('#btn-qr').addEventListener('click', openQrScanner)
    $('#qr-close').addEventListener('click', closeQrScanner)
    $('#btn-manual-code').addEventListener('click', function () {
      $('#manual-code-box').classList.toggle('hidden')
    })
    $('#btn-manual-code-submit').addEventListener('click', onManualCodeEntry)
    $('#btn-qr-manual').addEventListener('click', function () {
      $('#qr-manual-box').classList.toggle('hidden')
    })
    $('#btn-qr-manual-submit').addEventListener('click', onQrManualCodeEntry)
    $('#qr-overlay').addEventListener('click', function (e) {
      if (e.target === $('#qr-overlay')) closeQrScanner()
    })

    // Modal
    $('#modal-close').addEventListener('click', closeModal)
    $('#modal-overlay').addEventListener('click', function (e) {
      if (e.target === $('#modal-overlay')) closeModal()
      var btn = e.target.closest('[data-action]')
      if (!btn) return
      var action = btn.getAttribute('data-action')
      if (action === 'close-modal') closeModal()
      else if (action === 'add-item') addInvoiceItem()
      else if (action === 'remove-item') removeInvoiceItem(btn)
      else if (action === 'add-po-item') addPoItem()
      else if (action === 'remove-po-item') removePoItem(btn)
    })
    $('#modal-body').addEventListener('input', function (e) {
      if (e.target && (e.target.classList.contains('f-item-qty') || e.target.classList.contains('f-item-price'))) {
        recomputeInvoiceTotals()
      }
      if (e.target && (e.target.classList.contains('po-item-qty') || e.target.classList.contains('po-item-price'))) {
        recomputePoTotals()
      }
    })

    $('#app-header').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]')
      if (!btn) return
      var action = btn.getAttribute('data-action')
      if (action === 'back') {
        history.back()
      } else if (action === 'refresh') {
        refreshCurrent()
      } else if (action === 'alerts') {
        navigate('/alerts')
      }
    })

    $('#tabbar').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-tab]')
      if (!btn) return
      var tab = btn.getAttribute('data-tab')
      navigate('/' + tab)
    })

    $('#screen-container').addEventListener('click', function (e) {
      var card = e.target.closest('.project-card')
      if (card) {
        navigate('/projects/' + encodeURIComponent(card.getAttribute('data-id')))
        return
      }
      var btn = e.target.closest('[data-action]')
      if (!btn) return
      var action = btn.getAttribute('data-action')
      var id = btn.getAttribute('data-id')
      if (action === 'sign-out') signOut()
      else if (action === 'change-server') changeServer()
      else if (action === 'retry') refreshCurrent()
      else if (action === 'link-qr') openQrScanner()
      else if (action === 'view-alerts') navigate('/alerts')
      else if (action === 'open-alerts') navigate('/alerts')
      else if (action === 'open-settings') navigate('/settings')
      else if (action === 'open-module') navigate('/m/' + btn.getAttribute('data-module'))
      else if (action === 'open-report') navigate('/report/' + btn.getAttribute('data-report'))
      else if (action === 'new-project') openProjectForm()
      else if (action === 'edit-project') openProjectForm(id)
      else if (action === 'new-invoice') openInvoiceForm()
      else if (action === 'new-payment') openPaymentForm()
      else if (action === 'new-contact') openContactForm()
      else if (action === 'edit-contact') openContactForm(id)
      else if (action === 'delete-contact') deleteContact(id)
      else if (action === 'add-task') openTaskForm(id)
      else if (action === 'task-complete') markTaskComplete(id)
      else if (action === 'new-property') openPropertyForm()
      else if (action === 'edit-property') openPropertyForm(id)
      else if (action === 'delete-property') deleteProperty(id)
      else if (action === 'new-inventory') openInventoryForm()
      else if (action === 'edit-inventory') openInventoryForm(id)
      else if (action === 'adjust-inventory') openInventoryAdjust(id)
      else if (action === 'delete-inventory') deleteInventory(id)
      else if (action === 'new-procurement') openProcurementForm()
      else if (action === 'edit-procurement') openProcurementForm(id)
      else if (action === 'view-procurement') viewProcurementDetail(id)
      else if (action === 'delete-procurement') deleteProcurement(id)
      else if (action === 'new-fleet') openFleetForm()
      else if (action === 'edit-fleet') openFleetForm(id)
      else if (action === 'delete-fleet') deleteFleet(id)
      else if (action === 'new-asset') openAssetForm()
      else if (action === 'edit-asset') openAssetForm(id)
      else if (action === 'delete-asset') deleteAsset(id)
      else if (action === 'new-employee') openEmployeeForm()
      else if (action === 'edit-employee') openEmployeeForm(id)
      else if (action === 'delete-employee') deleteEmployee(id)
      else if (action === 'pay-installment') openInstallmentPay(id)
    })

    window.addEventListener('hashchange', renderRoute)

    setupPullToRefresh()
  }

  /* ------------------------------ start ------------------------------ */

  wireEvents()
  boot()
})()
