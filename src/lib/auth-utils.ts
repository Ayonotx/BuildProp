import crypto from 'crypto'

const PBKDF2_ITERATIONS = 100_000
const SALT_LENGTH = 32
const HASH_LENGTH = 64
const ALGORITHM = 'sha256'

function getJwtSecret(): Buffer {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || 'buildprop-fallback-jwt-secret-do-not-use-in-production'
  return Buffer.from(secret, 'utf-8')
}

function base64url(data: Buffer | string): string {
  const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64urlDecode(str: string): Buffer {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/')
  while (b64.length % 4) b64 += '='
  return Buffer.from(b64, 'base64')
}

export function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH)
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, HASH_LENGTH, ALGORITHM, (err, derivedKey) => {
      if (err) return reject(err)
      resolve(`${salt.toString('hex')}:${derivedKey.toString('hex')}`)
    })
  })
}

export function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    if (storedHash.startsWith('plain:')) {
      return resolve(false)
    }
    
    const [saltHex, hashHex] = storedHash.split(':')
    if (!saltHex || !hashHex) return resolve(false)
    
    if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) return resolve(false)
    if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) return resolve(false)
    
    const salt = Buffer.from(saltHex, 'hex')
    const expectedHash = Buffer.from(hashHex, 'hex')
    
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, HASH_LENGTH, ALGORITHM, (err, derivedKey) => {
      if (err) return reject(err)
      if (expectedHash.length !== derivedKey.length) return resolve(false)
      try {
        resolve(crypto.timingSafeEqual(expectedHash, derivedKey))
      } catch {
        resolve(false)
      }
    })
  })
}

interface JwtPayload {
  userId: string
  email: string
  role: string
}

export function generateToken(payload: JwtPayload): string {
  const secret = getJwtSecret()
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const now = Math.floor(Date.now() / 1000)
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + 24 * 60 * 60 }))
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
  return `${header}.${body}.${base64url(signature)}`
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const secret = getJwtSecret()
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, body, sig] = parts
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
    const providedSig = base64urlDecode(sig)
    if (expectedSig.length !== providedSig.length || !crypto.timingSafeEqual(expectedSig, providedSig)) return null
    const payload = JSON.parse(Buffer.from(base64urlDecode(body)).toString('utf-8'))
    if (typeof payload.exp === 'number' && payload.exp < Math.floor(Date.now() / 1000)) return null
    if (!payload.userId || !payload.email || !payload.role) return null
    return { userId: payload.userId, email: payload.email, role: payload.role }
  } catch {
    return null
  }
}
