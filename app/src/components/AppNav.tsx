'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useRouter } from 'next/navigation'

interface NavItem {
  href: string
  label: string
  icon: React.ReactNode
}

const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7m-9 9V9m-2 2h14" />
  </svg>
)
const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <rect x="3" y="4" width="18" height="18" rx="2" strokeLinecap="round" strokeLinejoin="round" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 2v4M8 2v4M3 10h18" />
  </svg>
)
const StatsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)
const ClipboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
)
const TeamIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)
const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)
const DocIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v6h6" />
  </svg>
)

const playerNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: <HomeIcon /> },
  { href: '/schedule', label: 'Schedule', icon: <CalendarIcon /> },
  { href: '/documents', label: 'Docs', icon: <DocIcon /> },
  { href: '/stats', label: 'My Stats', icon: <StatsIcon /> },
]

// COACH: limited — trainings, schedule, team stats, docs
const coachNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: <HomeIcon /> },
  { href: '/schedule', label: 'Schedule', icon: <CalendarIcon /> },
  { href: '/coach/trainings', label: 'Trainings', icon: <ClipboardIcon /> },
  { href: '/documents', label: 'Docs', icon: <DocIcon /> },
  { href: '/coach/stats', label: 'Team', icon: <TeamIcon /> },
]

// COMITE: full access
const comiteNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Home', icon: <HomeIcon /> },
  { href: '/schedule', label: 'Schedule', icon: <CalendarIcon /> },
  { href: '/coach/events', label: 'Events', icon: <ClipboardIcon /> },
  { href: '/coach/documents', label: 'Docs', icon: <DocIcon /> },
  { href: '/coach/stats', label: 'Team', icon: <TeamIcon /> },
  { href: '/coach/teams', label: 'Teams', icon: <ShieldIcon /> },
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

  const navItems = role === 'COMITE' ? comiteNavItems
    : role === 'COACH' ? coachNavItems
    : playerNavItems

  return (
    <>
      {/* Top header */}
      <header className="sticky top-0 z-50 bg-mk-navy-dark border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard">
            <span className="font-display text-xl font-bold tracking-widest uppercase">
              <span className="text-white">Mamer </span><span className="text-mk-gold">Knights</span>
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

      {/* Bottom nav — fixed with safe-area for iOS/iPad */}
      <nav
        className="fixed bottom-0 inset-x-0 z-50 bg-mk-navy border-t border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-2xl mx-auto flex">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition-colors ${
                  active ? 'text-mk-gold' : 'text-white/30 hover:text-white/60'
                }`}
              >
                {item.icon}
                <span className="text-[10px] font-display uppercase tracking-wide leading-none">
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
