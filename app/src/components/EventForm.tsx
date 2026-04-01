'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

interface EventFormProps {
  initial?: {
    id: string
    type: string
    title: string
    date: string
    startTime: string
    endTime?: string | null
    location?: string | null
    opponent?: string | null
    homeAway?: string | null
    notes?: string | null
    isPublic: boolean
    isTemplate: boolean
  }
}

export function EventForm({ initial }: EventFormProps) {
  const router = useRouter()
  const isEdit = !!initial

  const [form, setForm] = useState({
    type: initial?.type ?? 'TRAINING',
    title: initial?.title ?? 'Training',
    date: initial?.date ?? '',
    startTime: initial?.startTime ?? '19:00',
    endTime: initial?.endTime ?? '21:00',
    location: initial?.location ?? '',
    opponent: initial?.opponent ?? '',
    homeAway: initial?.homeAway ?? 'HOME',
    notes: initial?.notes ?? '',
    isPublic: initial?.isPublic ?? true,
    isTemplate: initial?.isTemplate ?? false,
  })

  const create = trpc.events.create.useMutation({
    onSuccess: () => router.push('/coach/events'),
  })
  const update = trpc.events.update.useMutation({
    onSuccess: () => router.push(`/coach/events/${initial?.id}`),
  })

  const isPending = create.isPending || update.isPending
  const error = create.error?.message || update.error?.message

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      type: form.type as 'GAME' | 'TRAINING' | 'EVENT',
      title: form.type === 'TRAINING' ? 'Training' : form.title,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime || undefined,
      location: form.location || undefined,
      opponent: form.type === 'GAME' ? form.opponent || undefined : undefined,
      homeAway: form.type === 'GAME' ? (form.homeAway as 'HOME' | 'AWAY') : undefined,
      notes: form.notes || undefined,
      isPublic: form.isPublic,
      isTemplate: form.isTemplate,
    }
    if (isEdit) {
      update.mutate({ id: initial!.id, ...data })
    } else {
      create.mutate(data)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type */}
      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Type</label>
        <div className="flex gap-2">
          {(['TRAINING', 'GAME', 'EVENT'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setForm((f) => ({
                  ...f,
                  type: t,
                  title: t === 'TRAINING' ? 'Training' : f.title === 'Training' ? '' : f.title,
                }))
              }}
              className={`flex-1 py-2 rounded-lg font-display text-sm uppercase tracking-wide transition-colors border ${
                form.type === t
                  ? 'bg-mk-gold text-mk-navy border-mk-gold'
                  : 'bg-transparent text-white/50 border-white/20 hover:border-white/40'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Title (not for Training) */}
      {form.type !== 'TRAINING' && (
        <div>
          <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">
            {form.type === 'GAME' ? 'Opponent' : 'Title'}
          </label>
          {form.type === 'GAME' ? (
            <div className="space-y-2">
              <input
                type="text"
                value={form.opponent}
                onChange={(e) => setForm((f) => ({ ...f, opponent: e.target.value, title: `vs ${e.target.value}` }))}
                placeholder="e.g. Luxembourg Pirates"
                className="input-field text-left tracking-normal"
                required
              />
              <div className="flex gap-2">
                {(['HOME', 'AWAY'] as const).map((ha) => (
                  <button
                    key={ha}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, homeAway: ha }))}
                    className={`flex-1 py-2 rounded-lg font-display text-sm uppercase tracking-wide transition-colors border ${
                      form.homeAway === ha
                        ? 'bg-mk-gold/20 text-mk-gold border-mk-gold/60'
                        : 'bg-transparent text-white/50 border-white/20'
                    }`}
                  >
                    {ha}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Event title"
              className="input-field text-left tracking-normal"
              required
            />
          )}
        </div>
      )}

      {/* Date */}
      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Date</label>
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className="input-field text-left tracking-normal"
          required
        />
      </div>

      {/* Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Start</label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className="input-field text-left tracking-normal"
            required
          />
        </div>
        <div>
          <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">End</label>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            className="input-field text-left tracking-normal"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Location</label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          placeholder="e.g. Stade Alphonse Theis"
          className="input-field text-left tracking-normal"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={3}
          placeholder="Optional notes..."
          className="input-field text-left tracking-normal resize-none"
        />
      </div>

      {/* Options */}
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
            className="accent-mk-gold"
          />
          Public (visible on website)
        </label>
        <label className="flex items-center gap-2 text-white/60 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={form.isTemplate}
            onChange={(e) => setForm((f) => ({ ...f, isTemplate: e.target.checked }))}
            className="accent-mk-gold"
          />
          Template (for recurring)
        </label>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary flex-1">
          {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Event'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  )
}
