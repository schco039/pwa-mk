'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

interface Team {
  id: string
  name: string
  shortName: string | null
  location: string | null
  logoUrl: string | null
}

interface EventFormProps {
  teams?: Team[]
  initial?: {
    id: string
    type: string
    title: string
    date: string
    startTime: string
    endTime?: string | null
    location?: string | null
    opponent?: string | null
    opponentTeamId?: string | null
    homeAway?: string | null
    notes?: string | null
    isPublic: boolean
    isTemplate: boolean
    allowMaybe: boolean
    category?: string | null
  }
}

export function EventForm({ teams = [], initial }: EventFormProps) {
  const router = useRouter()
  const isEdit = !!initial

  const [form, setForm] = useState({
    type: initial?.type ?? 'TRAINING',
    title: initial?.title ?? 'Training',
    date: initial?.date ?? '',
    startTime: initial?.startTime ?? '19:00',
    endTime: initial?.endTime ?? '21:00',
    location: initial?.location ?? '',
    opponentTeamId: initial?.opponentTeamId ?? '',
    opponentFreeText: initial?.opponent ?? '',
    homeAway: initial?.homeAway ?? 'HOME',
    notes: initial?.notes ?? '',
    category: (initial?.category ?? '') as '' | 'FLAG' | 'TACKLE',
    isPublic: initial?.isPublic ?? true,
    isTemplate: initial?.isTemplate ?? false,
    allowMaybe: initial?.allowMaybe ?? false,
  })

  // Recurring generation fields (only when isTemplate)
  const [recurring, setRecurring] = useState({ weeks: 8, startDate: '' })

  const create = trpc.events.create.useMutation({
    onSuccess: () => router.push('/coach/events'),
  })
  const update = trpc.events.update.useMutation({
    onSuccess: () => router.push(`/coach/events/${initial?.id}`),
  })
  const generateRecurring = trpc.events.generateRecurring.useMutation()

  const isPending = create.isPending || update.isPending || generateRecurring.isPending
  const error = create.error?.message || update.error?.message || generateRecurring.error?.message

  // Opponent: prefer team from dropdown, fallback to free text
  const opponentTeam = teams.find((t) => t.id === form.opponentTeamId)
  const effectiveTitle =
    form.type === 'GAME'
      ? opponentTeam
        ? `${form.homeAway === 'HOME' ? 'vs' : '@'} ${opponentTeam.name}`
        : form.opponentFreeText
          ? `${form.homeAway === 'HOME' ? 'vs' : '@'} ${form.opponentFreeText}`
          : 'Game'
      : form.type === 'TRAINING'
        ? 'Training'
        : form.title

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      type: form.type as 'GAME' | 'TRAINING' | 'EVENT',
      title: effectiveTitle,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime || undefined,
      location: form.location || undefined,
      opponent: form.type === 'GAME' ? ((opponentTeam?.name ?? form.opponentFreeText) || undefined) : undefined,
      opponentTeamId: form.type === 'GAME' && form.opponentTeamId ? form.opponentTeamId : undefined,
      homeAway: form.type === 'GAME' ? (form.homeAway as 'HOME' | 'AWAY') : undefined,
      notes: form.notes || undefined,
      isPublic: form.isPublic,
      isTemplate: form.isTemplate,
      allowMaybe: form.allowMaybe,
      category: (form.type === 'TRAINING' || form.type === 'GAME') && form.category ? (form.category as 'FLAG' | 'TACKLE') : undefined,
    }

    if (isEdit) {
      update.mutate({ id: initial!.id, ...data })
    } else {
      const created = await create.mutateAsync(data)
      // If template + recurring, generate sessions immediately
      if (form.isTemplate && recurring.startDate && recurring.weeks > 0) {
        await generateRecurring.mutateAsync({
          templateId: created.id,
          weeks: recurring.weeks,
          startDate: recurring.startDate,
        })
      }
      router.push('/coach/events')
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
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  type: t,
                  title: t === 'TRAINING' ? 'Training' : f.title === 'Training' ? '' : f.title,
                }))
              }
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

      {/* Game-specific: opponent */}
      {form.type === 'GAME' && (
        <div className="space-y-3">
          <div>
            <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Opponent</label>
            {teams.length > 0 ? (
              <select
                value={form.opponentTeamId}
                onChange={(e) => setForm((f) => ({ ...f, opponentTeamId: e.target.value, opponentFreeText: '' }))}
                className="input-field text-left tracking-normal"
              >
                <option value="">— select team or type below —</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}{t.location ? ` (${t.location})` : ''}
                  </option>
                ))}
              </select>
            ) : null}
            {!form.opponentTeamId && (
              <input
                type="text"
                value={form.opponentFreeText}
                onChange={(e) => setForm((f) => ({ ...f, opponentFreeText: e.target.value }))}
                placeholder={teams.length > 0 ? 'Or type opponent name manually' : 'e.g. Luxembourg Pirates'}
                className={`input-field text-left tracking-normal ${teams.length > 0 ? 'mt-2' : ''}`}
              />
            )}
            {opponentTeam?.logoUrl && (
              <img src={opponentTeam.logoUrl} alt={opponentTeam.name} className="mt-2 w-10 h-10 object-contain rounded bg-white/5" />
            )}
          </div>

          <div>
            <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Home / Away</label>
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
        </div>
      )}

      {/* Event title */}
      {form.type === 'EVENT' && (
        <div>
          <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Event title"
            className="input-field text-left tracking-normal"
            required
          />
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
          placeholder={
            form.type === 'GAME' && opponentTeam?.location && form.homeAway === 'AWAY'
              ? opponentTeam.location
              : 'e.g. Stade Alphonse Theis'
          }
          className="input-field text-left tracking-normal"
        />
        {form.type === 'GAME' && opponentTeam?.location && form.homeAway === 'AWAY' && !form.location && (
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, location: opponentTeam.location! }))}
            className="text-xs text-mk-gold hover:underline mt-1"
          >
            Use {opponentTeam.name} location: {opponentTeam.location}
          </button>
        )}
      </div>

      {/* Notes */}
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

      {/* Training / Game category */}
      {(form.type === 'TRAINING' || form.type === 'GAME') && (
        <div>
          <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">Category</label>
          <div className="flex gap-2">
            {([
              { value: '' as const, label: 'Both (Flag & Tackle)' },
              { value: 'FLAG' as const, label: '🏴 Flag Football' },
              { value: 'TACKLE' as const, label: '🏈 Tackle Football' },
            ]).map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: opt.value }))}
                className={`flex-1 py-2 px-2 rounded-lg font-display text-xs uppercase tracking-wide transition-colors border ${
                  form.category === opt.value
                    ? 'bg-mk-gold text-mk-navy border-mk-gold'
                    : 'bg-transparent text-white/50 border-white/20 hover:border-white/40'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Options */}
      <div className="space-y-2 border border-white/10 rounded-lg p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isPublic}
            onChange={(e) => setForm((f) => ({ ...f, isPublic: e.target.checked }))}
            className="w-4 h-4 accent-mk-gold"
          />
          <span className="text-white/70 text-sm">Visible on website (public)</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.allowMaybe}
            onChange={(e) => setForm((f) => ({ ...f, allowMaybe: e.target.checked }))}
            className="w-4 h-4 accent-mk-gold"
          />
          <span className="text-white/70 text-sm">Allow "Maybe" RSVP responses</span>
        </label>

        {form.type === 'TRAINING' && !isEdit && (
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isTemplate}
              onChange={(e) => setForm((f) => ({ ...f, isTemplate: e.target.checked }))}
              className="w-4 h-4 accent-mk-gold"
            />
            <span className="text-white/70 text-sm">Recurring training (generate multiple sessions)</span>
          </label>
        )}
      </div>

      {/* Recurring options */}
      {form.isTemplate && !isEdit && (
        <div className="border border-mk-gold/30 rounded-lg p-4 space-y-4 bg-mk-gold/5">
          <p className="text-mk-gold text-sm font-display uppercase tracking-wide">Recurring Settings</p>
          <p className="text-white/50 text-xs">
            The date above is used as the day of week pattern. Sessions will be generated on the same weekday.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/60 text-xs mb-1 uppercase tracking-wide">Start from</label>
              <input
                type="date"
                value={recurring.startDate}
                onChange={(e) => setRecurring((r) => ({ ...r, startDate: e.target.value }))}
                className="input-field text-left tracking-normal text-sm py-2"
                required={form.isTemplate}
              />
            </div>
            <div>
              <label className="block text-white/60 text-xs mb-1 uppercase tracking-wide">Weeks</label>
              <input
                type="number"
                min={1}
                max={52}
                value={recurring.weeks}
                onChange={(e) => setRecurring((r) => ({ ...r, weeks: parseInt(e.target.value) || 1 }))}
                className="input-field text-left tracking-normal text-sm py-2"
              />
            </div>
          </div>
          <p className="text-white/40 text-xs">
            Will generate {recurring.weeks} training session{recurring.weeks !== 1 ? 's' : ''} starting {recurring.startDate || '…'}
          </p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending} className="btn-primary flex-1">
          {isPending
            ? form.isTemplate && !isEdit ? 'Generating...' : 'Saving...'
            : isEdit
              ? 'Save Changes'
              : form.isTemplate
                ? `Create & Generate ${recurring.weeks} Sessions`
                : 'Create Event'}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">
          Cancel
        </button>
      </div>
    </form>
  )
}
