import { type Role } from '@prisma/client'

interface PahekoMember {
  id: number
  nom: string
  prenom?: string
  email: string
  id_category: number
  telephone?: string
}

interface NormalizedUser {
  pahekoId: number
  name: string
  email: string
  role: Role
  phone: string | null
}

function getRoleMap(): Record<number, Role> {
  const raw = process.env.PAHEKO_ROLE_MAP ?? '1:PLAYER,2:COACH,3:COMITE'
  const map: Record<number, Role> = {}
  for (const part of raw.split(',')) {
    const [catId, role] = part.trim().split(':')
    if (catId && role) map[parseInt(catId)] = role as Role
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
    // Don't cache — always fetch fresh user data
    cache: 'no-store',
  })

  if (!res.ok) throw new Error(`Paheko API ${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

function normalize(m: PahekoMember): NormalizedUser {
  const roleMap = getRoleMap()
  return {
    pahekoId: m.id,
    name: [m.prenom, m.nom].filter(Boolean).join(' '),
    email: m.email,
    role: roleMap[m.id_category] ?? 'PLAYER',
    phone: m.telephone ?? null,
  }
}

/** Look up a single member by email in Paheko */
export async function findPahekoUserByEmail(email: string): Promise<NormalizedUser | null> {
  try {
    // Paheko API: search members — endpoint may vary by version
    const data = await pahekoGet<{ results?: PahekoMember[]; list?: PahekoMember[] } | PahekoMember[]>(
      `user/search?q=${encodeURIComponent(email)}`,
    )

    const members: PahekoMember[] = Array.isArray(data)
      ? data
      : (data.results ?? data.list ?? [])

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
    const data = await pahekoGet<{ results?: PahekoMember[]; list?: PahekoMember[] } | PahekoMember[]>(
      'user/list',
    )
    const members: PahekoMember[] = Array.isArray(data)
      ? data
      : (data.results ?? data.list ?? [])

    return members.filter((m) => m.email).map(normalize)
  } catch (err) {
    console.error('[paheko] fetchAll failed:', err)
    return []
  }
}
