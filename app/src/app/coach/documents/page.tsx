import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { validateSession } from '@/lib/auth'
import { AppNav } from '@/components/AppNav'
import { DocumentsAdmin } from '@/components/DocumentsAdmin'

export default async function DocumentsAdminPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get('knights_session')?.value
  if (!token) redirect('/login')
  const user = await validateSession(token)
  if (!user || user.role !== 'COMITE') redirect('/dashboard')

  return (
    <div className="min-h-[100dvh] pb-[calc(7rem+env(safe-area-inset-bottom,0px))]">
      <AppNav userName={user.name} role={user.role} />
      <main className="max-w-2xl mx-auto px-4 pt-6 space-y-5">
        <h1 className="font-display text-2xl font-bold text-mk-gold uppercase tracking-widest">Dokumente</h1>
        <DocumentsAdmin />
      </main>
    </div>
  )
}
