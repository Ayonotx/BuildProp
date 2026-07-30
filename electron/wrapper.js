const http = require('http')
const fs = require('fs')
const path = require('path')
const net = require('net')
const { spawn } = require('child_process')

const PORT = parseInt(process.env.PORT || '3456', 10)
const INTERNAL_PORT = PORT + 1
const HOSTNAME = process.env.HOSTNAME || '127.0.0.1'
const serverDir = process.env.SERVER_DIR || __dirname

// Start Next.js server on internal port using spawn (NOT fork - fork has issues in Electron packaged apps)
const serverJs = path.join(serverDir, 'server.js')
let started = false

function startNextServer() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [serverJs], {
      cwd: serverDir,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', PORT: String(INTERNAL_PORT), HOSTNAME },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    child.stdout.on('data', (d) => {
      const msg = d.toString()
      process.stdout.write('[next] ' + msg)
      if (!started && msg.includes('Ready')) { started = true; resolve(true) }
    })
    child.stderr.on('data', (d) => process.stderr.write('[next] ' + d))
    child.on('error', (err) => { console.error('[wrapper] Server error:', err.message); resolve(false) })
    child.on('exit', (code) => { if (!started) resolve(false) })

    // Timeout fallback - if Next.js doesn't say Ready in 20s, check port
    setTimeout(async () => {
      if (!started) {
        const portReady = await waitForPort(INTERNAL_PORT, HOSTNAME, 5000)
        if (portReady) { started = true; resolve(true) }
      }
    }, 20000)
  })
}

function waitForPort(port, host, timeoutMs) {
  const start = Date.now()
  return new Promise((resolve) => {
    function tryConnect() {
      if (Date.now() - start > timeoutMs) { resolve(false); return }
      const socket = new net.Socket()
      socket.setTimeout(1000)
      socket.on('connect', () => { socket.destroy(); resolve(true) })
      socket.on('error', () => { socket.destroy(); setTimeout(tryConnect, 300) })
      socket.on('timeout', () => { socket.destroy(); setTimeout(tryConnect, 300) })
      socket.connect(port, host || '127.0.0.1')
    }
    tryConnect()
  })
}

// Create proxy server using built-in http
function createProxy() {
  const proxy = http.createServer((req, res) => {
    // Serve static files directly
    if (req.url.startsWith('/_next/static/')) {
      const filePath = path.join(serverDir, '.next', 'static', req.url.replace('/_next/static/', ''))
      if (fs.existsSync(filePath)) {
        const ext = path.extname(filePath)
        const mimeTypes = {
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
          '.woff2': 'font/woff2',
        }
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' })
        fs.createReadStream(filePath).pipe(res)
        return
      }
    }

    // Forward to Next.js
    const options = {
      hostname: HOSTNAME,
      port: INTERNAL_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers },
    }
    // Don't compress - localhost proxy doesn't need it
    delete options.headers['accept-encoding']

    const proxyReq = http.request(options, (proxyRes) => {
      const headers = { ...proxyRes.headers }
      // Keep content-encoding intact so browsers can decompress
      res.writeHead(proxyRes.statusCode, headers)
      proxyRes.pipe(res)
    })

    proxyReq.on('error', () => { res.writeHead(502); res.end('Proxy Error') })
    req.pipe(proxyReq)
  })

  proxy.listen(PORT, HOSTNAME, () => {
    console.log('[wrapper] BuildProp server on http://' + HOSTNAME + ':' + PORT)
    if (process.send) process.send('ready')
  })

  proxy.on('error', (e) => {
    if (e.code === 'EADDRINUSE') console.error('[wrapper] Port ' + PORT + ' is in use')
    else console.error('[wrapper] ' + e.message)
  })
}

// Main flow
startNextServer().then((ready) => {
  if (ready) { createProxy() }
  else { console.error('[wrapper] Next.js did not start'); process.exit(1) }
})

