const { app, BrowserWindow, dialog } = require('electron')
const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')

let mainWindow = null
let serverProcess = null
let ollamaProcess = null

const PORT = 3456
const OLLAMA_PORT = 11434

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

function setupOllamaData() {
  const aiDir = getAiDir()
  const bundledModels = path.join(aiDir, 'models')
  if (!fs.existsSync(bundledModels)) return false
  const ollamaData = getOllamaDataDir()
  const modelsDir = path.join(ollamaData, 'models')
  if (fs.existsSync(modelsDir)) return true
  try {
    console.log('[main] Setting up offline AI model (one-time copy)...')
    fs.mkdirSync(ollamaData, { recursive: true })
    copyFolderSync(bundledModels, modelsDir)
    console.log('[main] Offline AI model ready')
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
  if (!fs.existsSync(modelsDir)) setupOllamaData()

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

// === App Lifecycle ===
app.on('ready', async () => {
    loadEnv()
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
