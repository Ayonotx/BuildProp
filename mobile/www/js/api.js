(function () {
  'use strict'

  const TIMEOUT_MS = 15000
  const PUBLIC_PATHS = ['/api/mobile/auth', '/api/mobile/pair/confirm', '/api/setup']

  let baseUrl = ''
  let token = ''

  class ApiError extends Error {
    constructor(message, status) {
      super(message)
      this.name = 'ApiError'
      this.status = status || 0
    }
  }

  function normalizeUrl(url) {
    return String(url || '').trim().replace(/\/+$/, '')
  }

  function configure(serverUrl) {
    baseUrl = normalizeUrl(serverUrl)
    return baseUrl
  }

  function setToken(value) {
    token = value || ''
  }

  function isPublicPath(path) {
    return PUBLIC_PATHS.indexOf(path) !== -1
  }

  async function apiFetch(path, options) {
    options = options || {}
    const method = (options.method || 'GET').toUpperCase()
    const hasBody = options.body !== undefined

    if (!baseUrl) {
      throw new ApiError('Server address is not configured.')
    }

    const headers = {}
    if (hasBody) headers['Content-Type'] = 'application/json'
    if (token && !isPublicPath(path)) headers['Authorization'] = 'Bearer ' + token

    const controller = new AbortController()
    const timer = setTimeout(function () { controller.abort() }, TIMEOUT_MS)

    let response
    try {
      response = await fetch(baseUrl + path, {
        method: method,
        headers: headers,
        body: hasBody ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      })
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new ApiError('Request timed out. Check the Server Address and try again.')
      }
      throw new ApiError('Cannot reach server. Check the Server Address and your connection.')
    } finally {
      clearTimeout(timer)
    }

    const text = await response.text()
    let body = null
    if (text) {
      try { body = JSON.parse(text) } catch (e) { body = null }
    }

    if (!response.ok) {
      const message =
        (body && (body.error || body.message)) ||
        'Request failed (' + response.status + ' ' + response.statusText + ')'
      throw new ApiError(message, response.status)
    }

    return body
  }

  async function testConnection(serverUrl) {
    const url = normalizeUrl(serverUrl)
    if (!url) throw new ApiError('Enter a server address first.')

    const controller = new AbortController()
    const timer = setTimeout(function () { controller.abort() }, TIMEOUT_MS)
    try {
      const response = await fetch(url + '/api/setup', {
        method: 'GET',
        signal: controller.signal,
      })
      if (!response.ok) {
        throw new ApiError('Server responded with status ' + response.status)
      }
      return true
    } catch (err) {
      if (err && err.name === 'AbortError') {
        throw new ApiError('Request timed out. Check the Server Address and try again.')
      }
      if (err instanceof ApiError) throw err
      throw new ApiError('Server not reachable at ' + url + '. Check the address and your connection.')
    } finally {
      clearTimeout(timer)
    }
  }

  window.BuildPropApi = {
    ApiError: ApiError,
    configure: configure,
    setToken: setToken,
    apiFetch: apiFetch,
    testConnection: testConnection,
    getBaseUrl: function () { return baseUrl },
    getToken: function () { return token },
  }
})()
