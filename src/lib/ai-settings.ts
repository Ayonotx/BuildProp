import { promises as fs } from 'fs'
import path from 'path'

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'ai-settings.json')

export interface ProviderConfig {
  enabled: boolean
  url?: string
  apiKey?: string
  model?: string
}

export interface AIProviderConfig {
  activeProvider: string
  ollama: ProviderConfig & { url: string }
  openai: ProviderConfig
  gemini: ProviderConfig
  anthropic: ProviderConfig
  groq: ProviderConfig
}

const DEFAULT_CONFIG: AIProviderConfig = {
  activeProvider: 'groq',
  ollama: { enabled: true, url: 'http://localhost:11434' },
  openai: { enabled: false, apiKey: '', model: 'gpt-4o-mini' },
  gemini: { enabled: false, apiKey: '', model: 'gemini-flash' },
  anthropic: { enabled: false, apiKey: '', model: 'claude-3.5-sonnet' },
  groq: { enabled: true, apiKey: '', model: 'llama-3.1-8b-instant' },
}

export function isValidOllamaUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    const hostname = parsed.hostname
    if (hostname === 'localhost') return true
    if (hostname === '127.0.0.1') return true
    if (hostname === '[::1]' || hostname === '::1') return true
    return false
  } catch {
    return false
  }
}

export async function getAISettings(): Promise<AIProviderConfig> {
  try {
    const raw = await fs.readFile(SETTINGS_FILE, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<AIProviderConfig>
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      ollama: {
        ...DEFAULT_CONFIG.ollama,
        ...parsed.ollama,
        url: parsed.ollama?.url && isValidOllamaUrl(parsed.ollama.url)
          ? parsed.ollama.url
          : DEFAULT_CONFIG.ollama.url,
      },
      openai: { ...DEFAULT_CONFIG.openai, ...parsed.openai },
      gemini: { ...DEFAULT_CONFIG.gemini, ...parsed.gemini },
      anthropic: { ...DEFAULT_CONFIG.anthropic, ...parsed.anthropic },
      groq: { ...DEFAULT_CONFIG.groq, ...parsed.groq },
    }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export async function saveAISettings(config: AIProviderConfig): Promise<void> {
  const dir = path.dirname(SETTINGS_FILE)
  await fs.mkdir(dir, { recursive: true })

  if (config.ollama.url && !isValidOllamaUrl(config.ollama.url)) {
    throw new Error('Invalid Ollama URL. Only localhost addresses are allowed.')
  }

  await fs.writeFile(SETTINGS_FILE, JSON.stringify(config, null, 2), 'utf-8')
}
