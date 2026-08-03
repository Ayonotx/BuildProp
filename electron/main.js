const { app, BrowserWindow, dialog, shell } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')
const http = require('http')

let mainWindow = null
let serverProcess = null
let ollamaProcess = null

let PORT = 3456
const OLLAMA_PORT = 11435

function getServerDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, '.next', 'standalone')
  }
  return path.join(__dirname, '..', '.next', 'standalone')
}

function getAiDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'ai')
  }
  return path.join(__dirname, 'resources', 'ai')
}

function getOllamaDataDir() {
  return path.join(app.getPath('appData'), 'BuildProp', 'ollama-data')
}

function resolveDatabaseUrl(envPath, url) {
  if (!url || !url.startsWith('file:')) return url
  // Only resolve relative paths (./ or ../)
  const filePart = url.slice(5)
  if (filePart.startsWith('./') || filePart.startsWith('../') || filePart.startsWith('.\\') || filePart.startsWith('..\\')) {
    const dir = require('path').dirname(envPath)
    const abs = require('path').resolve(dir, filePart)
    return 'file:' + abs
  }
  return url
}

function loadEnv() {
  const envPath = path.join(getServerDir(), '.env')
  try {
    if (fs.existsSync(envPath)) {
      const data = fs.readFileSync(envPath, 'utf-8')
      for (const line of data.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx > 0) {
          const key = trimmed.slice(0, eqIdx).trim()
          let val = trimmed.slice(eqIdx + 1).trim().replace(/^['"](.*)['"]$/, '$1')
          if (key && !process.env[key]) {
            if (key === 'DATABASE_URL') {
              val = resolveDatabaseUrl(envPath, val)
            }
            process.env[key] = val
          }
        }
      }
    }
  } catch (e) {
    console.warn('[main] Could not load .env:', e.message)
  }
}

async function waitForPort(port, host, timeoutMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolve, reject) => {
        const socket = new net.Socket()
        socket.setTimeout(2000)
        socket.on('connect', () => { socket.destroy(); resolve() })
        socket.on('error', reject)
        socket.on('timeout', () => { socket.destroy(); reject(new Error('timeout')) })
        socket.connect(port, host || '127.0.0.1')
      })
      return true
    } catch {
      await new Promise(r => setTimeout(r, 500))
    }
  }
  return false
}

async function waitForHttp(url, timeoutMs, intervalMs) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const ok = await new Promise((resolve) => {
      const req = http.get(url, (res) => { res.resume(); resolve(true) })
      req.on('error', () => resolve(false))
      req.setTimeout(2000, () => { req.destroy(); resolve(false) })
    })
    if (ok) return true
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return false
}

function copyFolderSync(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true })
  const entries = fs.readdirSync(src, { withFileTypes: true })
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      copyFolderSync(srcPath, destPath)
    } else {
      if (!fs.existsSync(destPath)) fs.copyFileSync(srcPath, destPath)
    }
  }
}

function getTimestampDirName() {
  const d = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
}

// Safety-net backup of the SQLite DB + small JSON configs, run shortly after startup.
// Never throws/crashes the app — any failure is caught and logged.
function runAutoBackup() {
  const BACKUP_KEEP = 10
  try {
    const serverDir = getServerDir()
    const dataDir = path.join(serverDir, 'data')
    const dbPath = path.join(serverDir, 'prisma', 'dev.db')
    const autoRoot = path.join(serverDir, 'backups', 'auto')
    const backupDir = path.join(autoRoot, getTimestampDirName())

    fs.mkdirSync(backupDir, { recursive: true })

    let copied = 0

    // SQLite database
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, path.join(backupDir, 'dev.db'))
      copied++
    } else {
      console.warn('[main] Auto-backup: database not found at ' + dbPath)
    }

    // Small JSON config files (skip backups/ and uploads/ which can be large)
    if (fs.existsSync(dataDir)) {
      const entries = fs.readdirSync(dataDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isFile()) continue
        if (!entry.name.toLowerCase().endsWith('.json')) continue
        fs.copyFileSync(path.join(dataDir, entry.name), path.join(backupDir, entry.name))
        copied++
      }
    }

    console.log('[main] Auto-backup created: ' + backupDir + ' (' + copied + ' file(s))')

    // Rotation: keep only the most recent BACKUP_KEEP auto-backups (timestamps sort lexically)
    if (fs.existsSync(autoRoot)) {
      const dirs = fs.readdirSync(autoRoot)
        .filter((name) => {
          try { return fs.statSync(path.join(autoRoot, name)).isDirectory() } catch { return false }
        })
        .sort()
        .reverse()
      while (dirs.length > BACKUP_KEEP) {
        const oldest = dirs.pop()
        fs.rmSync(path.join(autoRoot, oldest), { recursive: true, force: true })
        console.log('[main] Auto-backup rotation: removed ' + oldest)
      }
    }
  } catch (e) {
    console.error('[main] Auto-backup failed:', e.message)
  }
}

// Returns true only if EVERY digest referenced by EVERY manifest in modelsDir/manifests
// has a matching blob file in modelsDir/blobs. A manifest without its config/layer blobs
// would leave Ollama unable to register the model, so a partial dir must be repaired.
function isModelBundleComplete(modelsDir) {
  const manifestsDir = path.join(modelsDir, 'manifests')
  if (!fs.existsSync(manifestsDir)) return false
  const blobsDir = path.join(modelsDir, 'blobs')
  const required = new Set()

  const walk = (dir) => {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(entryPath)
      } else if (entry.isFile()) {
        try {
          const manifest = JSON.parse(fs.readFileSync(entryPath, 'utf-8'))
          if (manifest && typeof manifest.config?.digest === 'string') {
            required.add(manifest.config.digest.replace(/^sha256:/, ''))
          }
          if (Array.isArray(manifest.layers)) {
            for (const layer of manifest.layers) {
              if (layer && typeof layer.digest === 'string') {
                required.add(layer.digest.replace(/^sha256:/, ''))
              }
            }
          }
        } catch {
          // Unparseable manifest - treat as incomplete (will be repaired)
          required.add('__invalid__')
        }
      }
    }
  }

  walk(manifestsDir)

  if (required.size === 0) return false
  for (const hex of required) {
    if (hex === '__invalid__') return false
    if (!fs.existsSync(path.join(blobsDir, 'sha256-' + hex))) return false
  }
  return true
}

function setupOllamaData() {
  const aiDir = getAiDir()
  const bundledModels = path.join(aiDir, 'models')
  if (!fs.existsSync(bundledModels)) return false
  const ollamaData = getOllamaDataDir()
  const modelsDir = path.join(ollamaData, 'models')
  if (fs.existsSync(modelsDir) && isModelBundleComplete(modelsDir)) return true
  try {
    let repaired = false
    if (fs.existsSync(modelsDir)) {
      // Partial/corrupt copy from an earlier interrupted run - start clean.
      fs.rmSync(modelsDir, { recursive: true, force: true })
      repaired = true
    }
    console.log('[main] Setting up offline AI model (one-time copy)...')
    fs.mkdirSync(ollamaData, { recursive: true })
    copyFolderSync(bundledModels, modelsDir)
    console.log(repaired ? '[main] Offline AI model ready (repaired)' : '[main] Offline AI model ready')
    return true
  } catch (e) {
    console.error('[main] Failed to copy AI model:', e.message)
    return false
  }
}

function startNextServer() {
  return new Promise(async (resolve) => {
    const serverDir = getServerDir()
    if (!fs.existsSync(path.join(serverDir, 'server.js'))) {
      console.error('[main] Server not found at:', serverDir)
      resolve(false)
      return
    }

    // Resolve wrapper.js path
    let wrapperJs = path.join(__dirname, 'wrapper.js')
    if (app.isPackaged) {
      const target = path.join(serverDir, 'wrapper.js')
      if (!fs.existsSync(target)) {
        try { fs.copyFileSync(wrapperJs, target) } catch (e) {
          console.error('[main] Failed to copy wrapper.js:', e.message)
        }
      }
      wrapperJs = target
    }

    console.log('[main] Starting BuildProp server (wrapper)...')
    try {
      serverProcess = spawn(process.execPath, [wrapperJs], {
        cwd: serverDir,
        env: {
          ...process.env,
          ELECTRON_RUN_AS_NODE: '1',
          PORT: String(PORT),
          HOSTNAME: '127.0.0.1',
          SERVER_DIR: serverDir,
          NODE_ENV: 'production',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      if (!serverProcess) {
        console.error('[main] spawn() returned null')
        resolve(false)
        return
      }

      serverProcess.stdout.on('data', (d) => {
        const msg = d.toString().trim()
        if (msg) console.log('[server] ' + msg)
      })
      serverProcess.stderr.on('data', (d) => {
        const msg = d.toString().trim()
        if (msg) console.log('[server] ' + msg)
      })
      serverProcess.on('error', (err) => console.error('[server]', err.message))
      serverProcess.on('exit', (code) => { serverProcess = null })
    } catch (e) {
      console.error('[main] Failed to start server:', e.message)
      resolve(false)
      return
    }

    const ready = await waitForPort(PORT, '127.0.0.1', 30000)
    resolve(ready)
  })
}

function startOllama() {
  const aiMode = process.env.AI_MODE || 'disabled'
  const aiDir = getAiDir()
  const ollamaExe = path.join(aiDir, 'ollama.exe')

  // Only start Ollama in hybrid/premium mode AND if ollama.exe is bundled
  if (aiMode !== 'hybrid') {
    console.log('[main] AI mode: ' + aiMode + ' - Ollama not started')
    return false
  }

  if (!fs.existsSync(ollamaExe)) {
    console.log('[main] Ollama not bundled in this edition')
    return false
  }

  const ollamaData = getOllamaDataDir()
  const modelsDir = path.join(ollamaData, 'models')
  // Runs the completeness check and repairs a partial/corrupt model dir if needed.
  setupOllamaData()

  console.log('[main] Starting Ollama AI engine (backup)...')
  ollamaProcess = spawn(ollamaExe, ['serve'], {
    cwd: ollamaData,
    env: { ...process.env, OLLAMA_HOST: '127.0.0.1:' + OLLAMA_PORT, OLLAMA_MODELS: modelsDir },
  })
  ollamaProcess.stdout.on('data', (d) => { const msg = d.toString().trim(); if (msg) console.log('[AI] ' + msg) })
  ollamaProcess.stderr.on('data', (d) => { const msg = d.toString().trim(); if (msg) console.log('[AI] ' + msg) })
  ollamaProcess.on('error', (err) => console.error('[AI]', err.message))
  ollamaProcess.on('exit', (code) => { ollamaProcess = null })
  return true
}

// Pre-warms the bundled Ollama model so the first chat request is fast.
// Runs entirely in the background; never crashes or blocks startup (all errors caught).
async function prewarmOllama() {
  const baseUrl = 'http://127.0.0.1:' + OLLAMA_PORT
  try {
    const up = await waitForHttp(baseUrl + '/api/tags', 60000, 2000)
    if (!up) {
      console.log('[AI] prewarm: skipped (Ollama did not come up in time)')
      return
    }
    const body = JSON.stringify({ model: 'llama3.2:1b', prompt: 'hi', stream: false, keep_alive: '30m' })
    const statusCode = await new Promise((resolve) => {
      const req = http.request(baseUrl + '/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
        },
        timeout: 120000,
      }, (res) => {
        res.resume()
        resolve(res.statusCode || 0)
      })
      req.on('timeout', () => { req.destroy() })
      req.on('error', () => resolve(0))
      req.write(body)
      req.end()
    })
    console.log('[AI] prewarm: done (status ' + statusCode + ')')
  } catch (e) {
    console.log('[AI] prewarm: failed - ' + (e && e.message ? e.message : e))
  }
}

function createWindow() {
  try {
    mainWindow = new BrowserWindow({
      width: 1400,
      height: 900,
      minWidth: 1024,
      minHeight: 700,
      show: true,
      backgroundColor: '#0f172a',
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    mainWindow.setTitle('BuildProp - Construction & Real Estate Management')
    mainWindow.loadURL('http://127.0.0.1:' + PORT + '/login')
    mainWindow.on('closed', () => { mainWindow = null })
    mainWindow.on('ready-to-show', () => { mainWindow.show(); mainWindow.focus() })
  } catch (e) {
    console.error('[main] Window error:', e)
  }
}

// External links (http/https/tel/mailto/whatsapp) open in the OS default app
// instead of navigating inside the app window.
app.on('web-contents-created', (_event, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (/^(https?:|tel:|mailto:|whatsapp:)/i.test(url)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
  contents.on('will-navigate', (event, url) => {
    const appUrl = contents.getURL()
    const allowed = appUrl.indexOf('127.0.0.1') !== -1 || appUrl.indexOf('localhost') !== -1
    if (!allowed) {
      event.preventDefault()
      if (/^(https?:|tel:|mailto:|whatsapp:)/i.test(url)) shell.openExternal(url)
    }
  })
})

// === App Lifecycle ===
app.on('ready', async () => {
    loadEnv()
    PORT = parseInt(process.env.BUILDPROP_PORT || String(PORT), 10) || PORT
    // Force absolute DATABASE_URL - Prisma engine cannot resolve relative file: paths
    if (!process.env.DATABASE_URL || process.env.DATABASE_URL.startsWith("file:")) {
      process.env.DATABASE_URL = "file:" + path.join(getServerDir(), "prisma", "dev.db")
    }
  console.log('[main] BuildProp starting up...')
  console.log('[main] AI_MODE=' + (process.env.AI_MODE || 'not-set'))

  const serverStarted = await startNextServer()
  if (!serverStarted) {
    dialog.showErrorBox('Server Error',
      'Could not start the BuildProp server.\nPlease make sure no other application is using port ' + PORT + '.')
    app.quit()
    return
  }

  // Show window immediately, AI in background
  createWindow()
  setTimeout(() => startOllama(), 2000)
  setTimeout(() => prewarmOllama(), 4000)
  // Safety-net auto-backup shortly after the server is up (non-blocking, never crashes startup)
  setTimeout(() => runAutoBackup(), 1500)
})

app.on('window-all-closed', () => {
  if (ollamaProcess) { ollamaProcess.kill(); ollamaProcess = null }
  if (serverProcess) { serverProcess.kill(); serverProcess = null }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => { if (mainWindow === null) createWindow() })

app.on('before-quit', () => {
  if (ollamaProcess) { ollamaProcess.kill(); ollamaProcess = null }
  if (serverProcess) { serverProcess.kill(); serverProcess = null }
})
