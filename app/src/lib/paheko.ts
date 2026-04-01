import { type Role } from '@prisma/client'

// Shape returned by user/category — includes custom fields directly
interface PahekoMember {
  id: number
  nom: string
  email: string
  category: string
  telephone?: string
  player_app_role?: string | null  // custom field: PLAYER | COACH | COMITE
  jersey?: number | string | null  // custom field: jersey number
}

interface NormalizedUser {
  pahekoId: number
  name: string
  email: string
  role: Role | null  // null = field not set in Paheko → keep existing DB role
  phone: string | null
  jerseyNumber: number | null
}

const VALID_ROLES: Role[] = ['PLAYER', 'COACH', 'COMITE']

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
    headers: { Authorization: getBasicAuthHeader(), Accept: 'application/json' },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Paheko API ${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function normalizeRole(raw: string | null | undefined): Role | null {
  if (!raw || !raw.trim()) return null  // not set → caller keeps existing role
  const upper = raw.trim().toUpperCase() as Role
  return VALID_ROLES.includes(upper) ? upper : null
}

function normalize(m: PahekoMember): NormalizedUser {
  return {
    pahekoId: m.id,
    name: m.nom,
    email: m.email,
    role: normalizeRole(m.player_app_role),
    phone: m.telephone ?? null,
    jerseyNumber: m.jersey != null ? parseInt(String(m.jersey)) || null : null,
  }
}

// Short-lived cache (avoid hammering Paheko on every login)
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

/** Fetch all members from Paheko (for bulk sync) */
export async function fetchAllPahekoUsers(): Promise<NormalizedUser[]> {
  try {
    const members = await getAllMembers()
    return members.filter((m) => m.email).map(normalize)
  } catch (err) {
    console.error('[paheko] fetchAll failed:', err)
    return []
  }
}
