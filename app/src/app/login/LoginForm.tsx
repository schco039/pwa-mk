'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

type Step = 'email' | 'otp'

export function LoginForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const requestOtp = trpc.auth.requestOtp.useMutation({
    onSuccess: () => {
      setError(null)
      setStep('otp')
    },
    onError: (err) => setError(err.message),
  })

  const verifyOtp = trpc.auth.verifyOtp.useMutation({
    onSuccess: () => {
      router.push('/dashboard')
      router.refresh()
    },
    onError: (err) => setError(err.message),
  })

  const isPending = requestOtp.isPending || verifyOtp.isPending

  return (
    <div className="card space-y-6">
      {step === 'email' ? (
        <>
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold tracking-wide">Sign In</h2>
            <p className="mt-1 text-white/50 text-sm">Enter your team email to receive a login code</p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              requestOtp.mutate({ email })
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="sr-only">Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="your@email.com"
                className="input-field tracking-normal text-left"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={isPending}>
              {isPending ? 'Sending…' : 'Send login code'}
            </button>
          </form>
        </>
      ) : (
        <>
          <div className="text-center">
            <h2 className="font-display text-xl font-semibold tracking-wide">Enter your code</h2>
            <p className="mt-1 text-white/50 text-sm">
              We sent a 6-digit code to{' '}
              <span className="text-mk-gold">{email}</span>
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              setError(null)
              verifyOtp.mutate({ email, code })
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="otp" className="sr-only">Login code</label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                required
                autoComplete="one-time-code"
                placeholder="000000"
                className="input-field"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button type="submit" className="btn-primary w-full" disabled={isPending}>
              {isPending ? 'Verifying…' : 'Log in'}
            </button>

            <button
              type="button"
              className="w-full text-white/50 text-sm hover:text-white/80 transition-colors"
              onClick={() => {
                setStep('email')
                setCode('')
                setError(null)
              }}
            >
              ← Use a different email
            </button>
          </form>
        </>
      )}
    </div>
  )
}
