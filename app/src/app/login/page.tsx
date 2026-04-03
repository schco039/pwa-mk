import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Image from 'next/image'
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
        <div className="flex justify-center mb-5">
          <Image
            src="/icons/logo-source.png"
            alt="Mamer Knights"
            width={120}
            height={120}
            className="drop-shadow-[0_0_24px_rgba(212,168,67,0.4)]"
            priority
          />
        </div>
        <h1 className="font-display text-4xl font-bold tracking-widest uppercase">
          <span className="text-white">Mamer </span><span className="text-mk-gold">Knights</span>
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
