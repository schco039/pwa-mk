import { type Role } from '@prisma/client'

// Actual Paheko API response shape for user/category endpoint
interface PahekoMember {
  id: number
  numero?: string
  nom: string        // full name (Paheko stores as single field)
  email: string
  category: string   // category name, e.g. "Membres actifs"
  telephone?: string
}

interface NormalizedUser {
  pahekoId: number
  name: string
  email: string
  role: Role
  phone: string | null
}

// PAHEKO_ROLE_MAP maps category NAME to role, e.g.:
// "Membres actifs:PLAYER,Administrateurs:COMITE,Entraîneurs:COACH"
function getRoleMap(): Record<string, Role> {
  const raw = process.env.PAHEKO_ROLE_MAP ?? 'Membres actifs:PLAYER,Administrateurs:COMITE'
  const map: Record<string, Role> = {}
  for (const part of raw.split(',')) {
    const idx = part.indexOf(':')
    if (idx < 1) continue
    const catName = part.slice(0, idx).trim()
    const role = part.slice(idx + 1).trim()
    if (catName && role) map[catName] = role as Role
  }
  return map
}

function getBasicAuthHeader(): string {
  const user = process.env.PAHEKO_API_USER
  const pass = process.env.PAHEKO_API_PASS
  if (!user || !pass) throw new Error('Paheko API credentials not configured')
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
}

async function pahekoGet<T>(path: string): Promise<T> {
  const base = process.env.PAHEKO_URL?.replace(/\/$/, '')
  if (!base) throw new Error('PAHEKO_URL not configured')

  const res = await fetch(`${base}/api/${path}`, {
    headers: {
      Authorization: getBasicAuthHeader(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Paheko API ${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function normalize(m: PahekoMember): NormalizedUser {
  const roleMap = getRoleMap()
  return {
    pahekoId: m.id,
    name: m.nom,
    email: m.email,
    role: roleMap[m.category] ?? 'PLAYER',
    phone: m.telephone ?? null,
  }
}

// Cache all members for short period to avoid repeated API calls
let membersCache: { data: PahekoMember[]; fetchedAt: number } | null = null
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getAllMembers(): Promise<PahekoMember[]> {
  if (membersCache && Date.now() - membersCache.fetchedAt < CACHE_TTL) {
    return membersCache.data
  }
  const data = await pahekoGet<PahekoMember[]>('user/category')
  membersCache = { data, fetchedAt: Date.now() }
  return data
}

/** Look up a single member by email in Paheko */
export async function findPahekoUserByEmail(email: string): Promise<NormalizedUser | null> {
  try {
    const members = await getAllMembers()
    const match = members.find((m) => m.email?.toLowerCase() === email.toLowerCase())
    return match ? normalize(match) : null
  } catch (err) {
    console.error('[paheko] findByEmail failed:', err)
    return null
  }
}

/** Fetch all members from Paheko for periodic sync */
export async function fetchAllPahekoUsers(): Promise<NormalizedUser[]> {
  try {
    const members = await getAllMembers()
    return members.filter((m) => m.email).map(normalize)
  } catch (err) {
    console.error('[paheko] fetchAll failed:', err)
    return []
  }
}
