'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Home' },
  { href: '/schedule', label: 'Schedule' },
  { href: '/stats', label: 'My Stats' },
]

const coachNavItems = [
  { href: '/coach/events', label: 'Events' },
  { href: '/coach/stats', label: 'Team' },
  { href: '/coach/teams', label: 'Teams' },
]

interface AppNavProps {
  userName: string
  role: string
}

export function AppNav({ userName, role }: AppNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => router.push('/login'),
  })

  const isCoach = role === 'COACH' || role === 'COMITE'
  const allNavItems = isCoach ? [...navItems, ...coachNavItems] : navItems

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-50 bg-mk-navy-dark border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard">
            <span className="font-display text-xl font-bold tracking-widest text-mk-gold uppercase">
              Knights
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-white/40 text-sm hidden sm:block">{userName}</span>
            <button
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              className="text-white/40 text-sm hover:text-white/70 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav (mobile-first) */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-mk-navy border-t border-white/10 pb-safe">
        <div className="max-w-2xl mx-auto flex">
          {allNavItems.map((item) => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center py-3 text-xs font-display uppercase tracking-wide transition-colors ${
                  active ? 'text-mk-gold' : 'text-white/40 hover:text-white/70'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
