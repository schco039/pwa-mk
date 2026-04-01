import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'

export default async function Home() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value

  if (token) {
    const user = await validateSession(token)
    if (user) redirect('/dashboard')
  }

  redirect('/login')
}
