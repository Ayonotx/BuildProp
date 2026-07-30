const { app, BrowserWindow, dialog } = require('electron')
const { fork, spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const net = require('net')

let mainWindow = null
let serverProcess = null
let ollamaProcess = null

const PORT = 3456
const OLLAMA_PORT = 11434
const OLLAMA_MODEL = 'llama3.2:1b'

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
      if (!fs.existsSync(destPath)) {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}

function setupOllamaData() {
  const aiDir = getAiDir()
  const bundledModels = path.join(aiDir, 'models')
  if (!fs.existsSync(bundledModels)) return false

  const ollamaData = getOllamaDataDir()
  const modelsDir = path.join(ollamaData, 'models')

  if (fs.existsSync(modelsDir)) {
    // Already set up
    return true
  }

  try {
    console.log('Setting up offline AI model (one-time copy)...')
    fs.mkdirSync(ollamaData, { recursive: true })
    copyFolderSync(bundledModels, modelsDir)
    console.log('✅ Offline AI model ready')
    return true
  } catch (e) {
    console.error('Failed to copy AI model:', e.message)
    return false
  }
}

function startNextServer() {
  return new Promise(async (resolve) => {
    const serverDir = getServerDir()
    const serverJs = path.join(serverDir, 'server.js')

    if (!fs.existsSync(serverJs)) {
      console.error('Server not found at:', serverJs)
      resolve(false)
      return
    }

    console.log('Starting BuildProp server...')
    serverProcess = fork(serverJs, [], {
      cwd: serverDir,
      env: {
        ...process.env,
        PORT: String(PORT),
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

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

    const ready = await waitForPort(PORT, '127.0.0.1', 30000)
    resolve(ready)
  })
}

function startOllama() {
  const aiDir = getAiDir()
  const ollamaExe = path.join(aiDir, 'ollama.exe')

  if (!fs.existsSync(ollamaExe)) {
    console.log('Ollama not bundled — AI uses Groq cloud')
    return false
  }

  const ollamaData = getOllamaDataDir()
  const modelsDir = path.join(ollamaData, 'models')

  if (!fs.existsSync(modelsDir)) {
    setupOllamaData()
  }

  console.log('Starting Ollama AI engine...')
  ollamaProcess = spawn(ollamaExe, ['serve'], {
    cwd: ollamaData,
    env: {
      ...process.env,
      OLLAMA_HOST: '127.0.0.1:' + OLLAMA_PORT,
      OLLAMA_MODELS: modelsDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  ollamaProcess.stdout.on('data', (d) => {
    const msg = d.toString().trim()
    if (msg) console.log('[AI] ' + msg)
  })
  ollamaProcess.stderr.on('data', (d) => {
    const msg = d.toString().trim()
    if (msg) console.log('[AI] ' + msg)
  })
  ollamaProcess.on('error', (err) => console.error('[AI]', err.message))
  ollamaProcess.on('exit', (code) => { ollamaProcess = null })

  return true
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.setTitle('BuildProp ERP — Construction & Real Estate')
  mainWindow.loadURL('http://127.0.0.1:' + PORT + '/login')
  mainWindow.on('closed', () => { mainWindow = null })
}

app.on('ready', async () => {
  console.log('BuildProp starting up...')

  // Step 1: Start Next.js production server
  const serverStarted = await startNextServer()
  if (!serverStarted) {
    dialog.showErrorBox('Server Error',
      'Could not start the BuildProp server.\nPlease make sure no other application is using port ' + PORT + '.')
    app.quit()
    return
  }

  // Step 2: Start bundled Ollama AI engine (non-blocking)
  startOllama()

  // Step 3: Open the app window
  createWindow()
})

app.on('window-all-closed', () => {
  if (ollamaProcess) { ollamaProcess.kill(); ollamaProcess = null }
  if (serverProcess) { serverProcess.kill(); serverProcess = null }
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null) createWindow()
})

app.on('before-quit', () => {
  if (ollamaProcess) { ollamaProcess.kill(); ollamaProcess = null }
  if (serverProcess) { serverProcess.kill(); serverProcess = null }
})