'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

interface TeamFormProps {
  initial?: {
    id: string
    name: string
    shortName?: string | null
    location?: string | null
    logoUrl?: string | null
    notes?: string | null
  }
}

export function TeamForm({ initial }: TeamFormProps) {
  const router = useRouter()
  const isEdit = !!initial

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    shortName: initial?.shortName ?? '',
    location: initial?.location ?? '',
    logoUrl: initial?.logoUrl ?? '',
    notes: initial?.notes ?? '',
  })

  const create = trpc.teams.create.useMutation({ onSuccess: () => router.push('/coach/teams') })
  const update = trpc.teams.update.useMutation({ onSuccess: () => router.push('/coach/teams') })
  const isPending = create.isPending || update.isPending
  const error = create.error?.message || update.error?.message

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      name: form.name,
      shortName: form.shortName || undefined,
      location: form.location || undefined,
      logoUrl: form.logoUrl || undefined,
      notes: form.notes || undefined,
    }
    if (isEdit) update.mutate({ id: initial!.id, ...data })
    else create.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Team Name *</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Luxembourg Pirates"
          className="input-field text-left tracking-normal"
          required
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Short Name / Abbreviation</label>
        <input
          type="text"
          value={form.shortName}
          onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))}
          placeholder="e.g. LUX, PIR"
          className="input-field text-left tracking-normal"
          maxLength={10}
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Home City / Location</label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          placeholder="e.g. Luxembourg City"
          className="input-field text-left tracking-normal"
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Logo URL</label>
        <input
          type="url"
          value={form.logoUrl}
          onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
          placeholder="https://..."
          className="input-field text-left tracking-normal"
        />
        {form.logoUrl && (
          <img src={form.logoUrl} alt="preview" className="mt-2 w-16 h-16 object-contain rounded-lg bg-white/5" />
        )}
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder="Optional notes..."
          className="input-field text-left tracking-normal resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary flex-1">
          {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Team'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">Cancel</button>
      </div>
    </form>
  )
}
