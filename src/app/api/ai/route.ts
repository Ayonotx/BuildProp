import { promises as fs } from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth-utils'
import { getAISettings, saveAISettings, isValidOllamaUrl, type AIProviderConfig } from '@/lib/ai-settings'
import { prisma } from '@/lib/prisma'
import { executeAIAction } from '@/lib/ai-actions'

export const dynamic = 'force-dynamic'

const DEFAULT_OLLAMA_URL = 'http://localhost:11434'
const DEFAULT_OLLAMA_LIGHT_MODEL = 'llama3.2:1b'
const DEFAULT_OLLAMA_HEAVY_MODEL = 'llama3.2:1b'

const MAX_PROMPT_LENGTH = 10_000
const BUNDLED_MODEL = 'llama3.2:1b'
const BUNDLED_OLLAMA_PORT = 11434

const ALLOWED_MODELS: Record<string, string[]> = {
  ollama: ['llama3.2:1b', 'llama3.2:3b', 'llama3.2:latest', 'llama3.1:8b', 'llama3.1:70b', 'codellama:7b', 'mistral:7b'],
  openai: ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-flash', 'gemini-pro', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  anthropic: ['claude-3.5-sonnet', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
  groq: ['llama-3.1-8b-instant', 'llama3-70b-8192', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
}

function sanitizeInput(input: string): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .trim()
    .slice(0, MAX_PROMPT_LENGTH)
}

function validateModelName(provider: string, model: string | undefined): string {
  if (!model) return ''
  const allowed = ALLOWED_MODELS[provider]
  if (!allowed) return model
  return allowed.includes(model) ? model : allowed[0]
}

function resolveOllamaModel(modelTier: string | undefined): string {
  if (modelTier === 'light') return DEFAULT_OLLAMA_LIGHT_MODEL
  if (modelTier === 'heavy') return DEFAULT_OLLAMA_HEAVY_MODEL
  return process.env.OLLAMA_MODEL || DEFAULT_OLLAMA_HEAVY_MODEL
}

async function verifyAdminAuth(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get('buildprop_token')?.value
  if (!token) return false
  const payload = verifyToken(token)
  if (!payload) return false
  return payload.role === 'admin'
}

async function queryOllama(prompt: string, systemPrompt: string | undefined, config: AIProviderConfig, modelTier?: string): Promise<string> {
  const ollamaUrl = config.ollama.url || DEFAULT_OLLAMA_URL
  if (!isValidOllamaUrl(ollamaUrl)) {
    return 'Invalid Ollama URL. Only localhost addresses are allowed.'
  }
  const model = resolveOllamaModel(modelTier)

  try {
    const messages = []
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) throw new Error(`Ollama returned ${response.status}`)

    const data = await response.json()
    return data.message?.content || 'No response from AI'
  } catch (error) {
    return `AI is currently unavailable. To enable it, install Ollama from https://ollama.com and run "ollama pull ${model}". Error: ${error instanceof Error ? error.message : 'Unknown'}`
  }
}

async function queryOpenAI(prompt: string, systemPrompt: string | undefined, config: AIProviderConfig): Promise<string> {
  const { apiKey, model } = config.openai
  if (!apiKey) return 'OpenAI API key is not configured. Please add your API key in AI Settings.'
  const validatedModel = validateModelName('openai', model)

  try {
    const messages: Array<{ role: string; content: string }> = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: prompt })

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: validatedModel, messages, temperature: 0.7 }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw new Error(err?.error?.message || `OpenAI returned ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'No response from AI'
  } catch (error) {
    return `OpenAI error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function queryGemini(prompt: string, systemPrompt: string | undefined, config: AIProviderConfig): Promise<string> {
  const { apiKey, model } = config.gemini
  if (!apiKey) return 'Google Gemini API key is not configured. Please add your API key in AI Settings.'
  const validatedModel = validateModelName('gemini', model)

  try {
    const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${validatedModel}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
        }),
        signal: AbortSignal.timeout(30_000),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw new Error(err?.error?.message || `Gemini returned ${response.status}`)
    }

    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI'
  } catch (error) {
    return `Gemini error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function queryAnthropic(prompt: string, systemPrompt: string | undefined, config: AIProviderConfig): Promise<string> {
  const { apiKey, model } = config.anthropic
  if (!apiKey) return 'Anthropic API key is not configured. Please add your API key in AI Settings.'
  const validatedModel = validateModelName('anthropic', model)

  try {
    const body: Record<string, unknown> = {
      model: validatedModel,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }
    if (systemPrompt) body.system = systemPrompt

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw new Error(err?.error?.message || `Anthropic returned ${response.status}`)
    }

    const data = await response.json()
    return data.content?.[0]?.text || 'No response from AI'
  } catch (error) {
    return `Anthropic error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function queryGroq(prompt: string, systemPrompt: string | undefined, config: AIProviderConfig): Promise<string> {
  const { apiKey, model } = config.groq || {}
  if (!apiKey) return 'Groq API key is not configured.'
  const validatedModel = validateModelName('groq', model || 'llama-3.1-8b-instant')

  try {
    const messages: Array<{ role: string; content: string }> = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: prompt })

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: validatedModel, messages, temperature: 0.7, max_tokens: 1024 }),
      signal: AbortSignal.timeout(30_000),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw new Error(err?.error?.message || `Groq returned ${response.status}`)
    }

    const data = await response.json()
    return data.choices?.[0]?.message?.content || 'No response from AI'
  } catch (error) {
    return `Groq error: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}

async function queryAI(prompt: string, systemPrompt: string | undefined, config: AIProviderConfig, modelTier?: string): Promise<string> {
  const providerName: string = config.activeProvider

  // Try the selected provider first
  let response: string
  switch (providerName) {
    case 'groq':
      response = await queryGroq(prompt, systemPrompt, config)
      if (!response.toLowerCase().includes('error')) return response
      break
    case 'openai':
      response = await queryOpenAI(prompt, systemPrompt, config)
      if (!response.toLowerCase().includes('error')) return response
      break
    case 'gemini':
      response = await queryGemini(prompt, systemPrompt, config)
      if (!response.toLowerCase().includes('error')) return response
      break
    case 'anthropic':
      response = await queryAnthropic(prompt, systemPrompt, config)
      if (!response.toLowerCase().includes('error')) return response
      break
    case 'ollama':
      response = await queryOllama(prompt, systemPrompt, config, modelTier)
      return response
    default:
      return 'AI provider not configured. Please go to Settings > AI Configuration to set up a provider.'
  }

  // Cloud provider failed - fall back to Ollama (local AI) if available
  if (process.env.AI_MODE === 'hybrid') {
    try {
      const ollamaResponse = await queryOllama(prompt, systemPrompt, config, modelTier)
      if (!ollamaResponse.toLowerCase().includes('error') && !ollamaResponse.toLowerCase().includes('unavailable')) {
        return ollamaResponse + '\n\n_(Using local AI fallback)_'
      }
    } catch {}
  }

  // If no fallback worked, return the original error
  return response || 'AI is currently unavailable. Please check your AI provider settings.'
}

export async function POST(request: Request) {
  try {
    // Check if AI is enabled for this edition
    const aiMode = process.env.AI_MODE || 'disabled'
    if (aiMode === 'disabled') {
      return Response.json({ error: 'AI is not available in this edition', available: false }, { status: 403 })
    }

    const { action, data: requestData } = await request.json()
    const config = await getAISettings()

    switch (action) {
      case 'update-settings': {
        const isAdmin = await verifyAdminAuth()
        if (!isAdmin) {
          return Response.json({ error: 'Admin access required' }, { status: 403 })
        }

        const incomingConfig = requestData as Partial<AIProviderConfig>
        const merged: AIProviderConfig = {
          ...config,
          ...incomingConfig,
          ollama: {
            ...config.ollama,
            ...incomingConfig?.ollama,
            url: incomingConfig?.ollama?.url || config.ollama.url,
          },
          openai: { ...config.openai, ...incomingConfig?.openai },
          gemini: { ...config.gemini, ...incomingConfig?.gemini },
          anthropic: { ...config.anthropic, ...incomingConfig?.anthropic },
          groq: { ...config.groq, ...incomingConfig?.groq },
        }

        if (merged.ollama.url && !isValidOllamaUrl(merged.ollama.url)) {
          return Response.json(
            { error: 'Invalid Ollama URL. Only localhost URLs are allowed.' },
            { status: 400 }
          )
        }

        await saveAISettings(merged)
        return Response.json({ success: true, message: 'AI settings saved securely on server.' })
      }

      case 'chat': {
        const { message } = requestData
        if (!message || typeof message !== 'string') {
          return Response.json({ error: 'Message is required' }, { status: 400 })
        }
        const sanitized = sanitizeInput(message)
        if (!sanitized) {
          return Response.json({ error: 'Message is empty after sanitization' }, { status: 400 })
        }

        // Try to execute as an action first
        const cookieStore = await cookies()
        const token = cookieStore.get('buildprop_token')?.value
        const payload = token ? verifyToken(token) : null
        const userId = payload?.userId || 'system'

        const actionResult = await executeAIAction(sanitized, userId)
        if (actionResult) {
          return Response.json({
            response: actionResult.description,
            action: actionResult.type,
            success: actionResult.success,
            provider: config.activeProvider,
          })
        }

        const [dashProjects, dashProperties, dashPayments, dashInvoices, dashTasks, dashEmployees] = await Promise.all([
          prisma.project.findMany({ select: { name: true, status: true, estimatedBudget: true, actualCost: true, completionPercentage: true }, take: 10 }),
          prisma.property.findMany({ select: { name: true, price: true, status: true, propertyType: true, city: true }, take: 10 }),
          prisma.payment.aggregate({ _sum: { amount: true }, where: { type: 'received' } }),
          prisma.invoice.findMany({ where: { status: { not: 'paid' } }, select: { invoiceNumber: true, totalAmount: true, paidAmount: true, dueDate: true } }),
          (prisma as any).projectTask.findMany({ select: { title: true, status: true, priority: true, dueDate: true }, take: 10 }),
          prisma.employee.findMany({ select: { employeeId: true, designation: true, salary: true }, take: 10 }),
        ])

        const totalRevenue = Number(dashPayments._sum.amount || 0)
        const totalOutstanding = dashInvoices.reduce((s, i) => s + Number(i.totalAmount) - Number(i.paidAmount), 0)

        const systemPrompt = `You are BuildProp AI Assistant for a construction & real estate company in Ghana. Currency is GHS (GH₵). Current date: ${new Date().toLocaleDateString('en-GB')}

REAL BUSINESS DATA (use ONLY these numbers, never fabricate):
- Projects: ${dashProjects.map(p => `${p.name} (${p.status}, ${p.completionPercentage}% complete, Budget: GH₵${Number(p.estimatedBudget).toLocaleString()})`).join('; ') || 'None'}
- Properties: ${dashProperties.map(p => `${p.name} (${p.status}, GH₵${Number(p.price).toLocaleString()})`).join('; ') || 'None'}
- Revenue: GH₵${totalRevenue.toLocaleString()}
- Outstanding invoices: GH₵${totalOutstanding.toLocaleString()} (${dashInvoices.length} unpaid)
- Tasks: ${(dashTasks as any[]).map((t: any) => `${t.title} [${t.status}, ${t.priority}]`).join('; ') || 'None'}
- Employees: ${dashEmployees.map((e: any) => `${e.employeeId} (${e.designation || 'N/A'})`).join('; ') || 'None'}

RULES:
- Always reference the REAL data above when answering questions
- Use specific numbers from the data (never say "$5 million" when actual is GH₵501,750)
- Currency is GHS (Ghana Cedis), formatted as GH₵X,XXX
- Be concise and actionable
- If asked about something not in the data, say "I don't have that data" rather than making it up`

        const modelTier = requestData?.model as string | undefined
        const response = await queryAI(sanitized, systemPrompt, config, modelTier)
        return Response.json({ response, provider: config.activeProvider })
      }

      case 'insights': {
        const [projects, properties, invoices, payments] = await Promise.all([
          prisma.project.findMany({ select: { name: true, status: true, estimatedBudget: true, actualCost: true, completionPercentage: true } }),
          prisma.property.count({ where: { status: 'available' } }),
          prisma.invoice.findMany({ where: { status: { not: 'paid' } }, select: { totalAmount: true, paidAmount: true, dueDate: true } }),
          prisma.payment.aggregate({ _sum: { amount: true }, where: { type: 'received' } }),
        ])

        const insightPrompt = `Based on this business data, provide 3-4 brief insights (one line each):
Projects: ${JSON.stringify(projects.slice(0, 5))}
Available properties: ${properties}
Outstanding invoices: ${invoices.length} totaling $${invoices.reduce((sum, i) => sum + Number(i.totalAmount) - Number(i.paidAmount), 0)}
Total revenue: $${payments._sum.amount || 0}
Provide practical, actionable insights.`

        const modelTier = requestData?.model as string | undefined
        const response = await queryAI(insightPrompt, undefined, config, modelTier)
        return Response.json({ insights: response, provider: config.activeProvider })
      }

      case 'predict': {
        const { entityType } = requestData
        const sanitizedType = entityType ? sanitizeInput(String(entityType)) : 'project completion'
        const prompt = `As a construction/real estate AI, provide a brief prediction analysis for ${sanitizedType}. Consider common industry factors. Keep response under 200 words.`
        const modelTier = requestData?.model as string | undefined
        const response = await queryAI(prompt, undefined, config, modelTier)
        return Response.json({ prediction: response, provider: config.activeProvider })
      }

      case 'test-connection': {
        const { provider } = requestData as { provider: string }
        try {
          if (provider === 'ollama') {
            const url = config.ollama.url || DEFAULT_OLLAMA_URL
            if (!isValidOllamaUrl(url)) {
              return Response.json({ success: false, message: 'Invalid Ollama URL. Only localhost URLs are allowed.' })
            }
            const res = await fetch(`${url}/api/tags`, {
              method: 'GET',
              signal: AbortSignal.timeout(10_000),
            })
            if (res.ok) {
              const data = await res.json()
              const models = data.models?.map((m: { name: string }) => m.name) || []
              return Response.json({ success: true, message: 'Connected to Ollama', models })
            }
            return Response.json({ success: false, message: 'Ollama returned an error' })
          }

          if (provider === 'openai') {
            const res = await queryOpenAI('Say "connected" in one word.', undefined, config)
            const success = !res.toLowerCase().includes('error')
            return Response.json({ success, message: success ? 'Connected to OpenAI' : res })
          }

          if (provider === 'gemini') {
            const res = await queryGemini('Say "connected" in one word.', undefined, config)
            const success = !res.toLowerCase().includes('error')
            return Response.json({ success, message: success ? 'Connected to Gemini' : res })
          }

          if (provider === 'anthropic') {
            const res = await queryAnthropic('Say "connected" in one word.', undefined, config)
            const success = !res.toLowerCase().includes('error')
            return Response.json({ success, message: success ? 'Connected to Anthropic' : res })
          }

          if (provider === 'groq') {
            const res = await queryGroq('Say "connected" in one word.', undefined, config)
            const success = !res.toLowerCase().includes('error')
            return Response.json({ success, message: success ? 'Connected to Groq' : res })
          }

          return Response.json({ success: false, message: 'Unknown provider' })
        } catch (error) {
          return Response.json({ success: false, message: error instanceof Error ? error.message : 'Connection failed' })
        }
      }

      default:
        return Response.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    // Check if AI is enabled for this edition
    const aiMode = process.env.AI_MODE || 'disabled'
    if (aiMode === 'disabled') {
      return Response.json({ available: false, model: null, models: [], error: 'AI is not available in this edition' })
    }

    const settings = await getAISettings()
    const { searchParams } = new URL(request.url)
    const ollamaUrl = settings.ollama?.url || searchParams.get('ollamaUrl') || DEFAULT_OLLAMA_URL

    if (!isValidOllamaUrl(ollamaUrl)) {
      if (settings.groq?.apiKey) {
        return Response.json({
          available: true,
          model: settings.groq.model || 'llama-3.1-8b-instant',
          models: ALLOWED_MODELS.groq,
          provider: 'groq',
        })
      }
      return Response.json({
        available: false,
        model: DEFAULT_OLLAMA_HEAVY_MODEL,
        error: 'Invalid Ollama URL. Only localhost addresses are allowed.',
      })
    }

    const response = await fetch(`${ollamaUrl}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(10_000),
    })

    if (response.ok) {
      const data = await response.json()
      const availableModels = data.models?.map((m: { name: string }) => m.name) || []
      const preferredOrder = ['llama3.2:1b', 'llama3.2:3b', 'llama3.2:latest', 'llama3.1:8b', 'llama3.1:70b', 'codellama:7b', 'mistral:7b']
      const bestModel = preferredOrder.find(m => availableModels.includes(m)) || availableModels[0] || DEFAULT_OLLAMA_HEAVY_MODEL

      return Response.json({
        available: true,
        model: bestModel,
        models: availableModels,
      })
    }

    if (settings.groq?.apiKey) {
      return Response.json({
        available: true,
        model: settings.groq.model || 'llama-3.1-8b-instant',
        models: ALLOWED_MODELS.groq,
        provider: 'groq',
      })
    }

    return Response.json({ available: false, model: DEFAULT_OLLAMA_HEAVY_MODEL, models: [] })
  } catch {
    return Response.json({ available: false, model: DEFAULT_OLLAMA_HEAVY_MODEL, models: [] })
  }
}
