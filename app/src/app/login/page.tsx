import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { LoginForm } from './LoginForm'

export default async function LoginPage() {
  // Already logged in → go to dashboard
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (token) {
    const user = await validateSession(token)
    if (user) redirect('/dashboard')
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Logo / Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-mk-navy border-2 border-mk-gold mb-6">
          {/* Shield placeholder — replace with actual SVG crest */}
          <svg viewBox="0 0 40 48" className="w-10 h-12 fill-mk-gold" aria-hidden>
            <path d="M20 0L0 8v18c0 11 8.5 20.5 20 22 11.5-1.5 20-11 20-22V8L20 0z" />
          </svg>
        </div>
        <h1 className="font-display text-4xl font-bold tracking-widest text-mk-gold uppercase">
          Mamer Knights
        </h1>
        <p className="mt-1 text-white/50 text-sm tracking-wide">Team App</p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </main>
  )
}
