'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'
import { useT } from '@/i18n/client'

interface Event {
  id: string
  type: string
  title: string
  date: string
  startTime: string
  endTime: string | null
  location: string | null
  category: string | null
  status: string
}

const typeColor: Record<string, string> = {
  GAME: 'text-mk-gold',
  TRAINING: 'text-blue-400',
  EVENT: 'text-purple-400',
}

export function BulkEventManager({ events }: { events: Event[] }) {
  const t = useT()
  const router = useRouter()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'TRAINING' | 'GAME' | 'EVENT'>('TRAINING')
  const [categoryFilter, setCategoryFilter] = useState<'' | 'FLAG' | 'TACKLE'>('')
  const [showEditPanel, setShowEditPanel] = useState(false)

  // Edit fields
  const [editForm, setEditForm] = useState({
    startTime: '',
    endTime: '',
    location: '',
    category: '' as '' | 'FLAG' | 'TACKLE' | 'CLEAR',
    notes: '',
  })

  const bulkDelete = trpc.events.bulkDelete.useMutation({
    onSuccess: (res) => {
      alert(`Deleted ${res.deleted} event${res.deleted !== 1 ? 's' : ''}.`)
      setSelected(new Set())
      router.refresh()
    },
  })

  const bulkUpdate = trpc.events.bulkUpdate.useMutation({
    onSuccess: (res) => {
      alert(`Updated ${res.updated} event${res.updated !== 1 ? 's' : ''}.`)
      setSelected(new Set())
      setShowEditPanel(false)
      setEditForm({ startTime: '', endTime: '', location: '', category: '', notes: '' })
      router.refresh()
    },
  })

  const isPending = bulkDelete.isPending || bulkUpdate.isPending

  // Filtered events
  const filtered = events.filter((e) => {
    if (typeFilter !== 'ALL' && e.type !== typeFilter) return false
    if (categoryFilter !== '' && e.category !== categoryFilter) return false
    return true
  })

  function toggleAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map((e) => e.id)))
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleDelete() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} event${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    bulkDelete.mutate({ ids: Array.from(selected) })
  }

  function handleUpdate() {
    if (selected.size === 0) return
    const patch: Parameters<typeof bulkUpdate.mutate>[0] = { ids: Array.from(selected) }
    if (editForm.startTime) patch.startTime = editForm.startTime
    if (editForm.endTime) patch.endTime = editForm.endTime
    if (editForm.location) patch.location = editForm.location
    if (editForm.category === 'FLAG') patch.category = 'FLAG'
    else if (editForm.category === 'TACKLE') patch.category = 'TACKLE'
    else if (editForm.category === 'CLEAR') patch.category = null
    if (editForm.notes) patch.notes = editForm.notes
    bulkUpdate.mutate(patch)
  }

  const allSelected = filtered.length > 0 && selected.size === filtered.length

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          {(['ALL', 'TRAINING', 'GAME', 'EVENT'] as const).map((t) => (
            <button key={t} onClick={() => { setTypeFilter(t); setSelected(new Set()) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wide border transition-colors ${
                typeFilter === t ? 'bg-mk-gold text-mk-navy border-mk-gold' : 'text-white/50 border-white/20 hover:border-white/40'
              }`}
            >{t}</button>
          ))}
        </div>

        {(typeFilter === 'TRAINING' || typeFilter === 'GAME' || typeFilter === 'ALL') && (
          <div className="flex gap-2">
            {([
              { v: '' as const, l: t.common.all },
              { v: 'FLAG' as const, l: t.common.flag },
              { v: 'TACKLE' as const, l: t.common.tackle },
            ]).map((opt) => (
              <button key={opt.v} onClick={() => { setCategoryFilter(opt.v); setSelected(new Set()) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-display uppercase tracking-wide border transition-colors ${
                  categoryFilter === opt.v ? 'bg-mk-gold/20 text-mk-gold border-mk-gold/50' : 'text-white/40 border-white/10 hover:border-white/30'
                }`}
              >{opt.l}</button>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      {selected.size > 0 && (
        <div className="card border-mk-gold/30 flex items-center gap-3 flex-wrap">
          <span className="text-mk-gold font-display text-sm uppercase tracking-wide flex-1">
            {t.bulkEdit.selected.replace('{count}', String(selected.size))}
          </span>
          <button
            onClick={() => setShowEditPanel((v) => !v)}
            className="btn-ghost text-sm py-1.5 px-4"
          >
            {showEditPanel ? t.bulkEdit.hideEdit : t.bulkEdit.editBtn}
          </button>
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="px-4 py-1.5 rounded-lg bg-red-700/80 text-white text-sm font-display uppercase tracking-wide hover:bg-red-600 disabled:opacity-50 transition-colors"
          >
            {bulkDelete.isPending ? t.bulkEdit.deleting : t.bulkEdit.deleteBtn}
          </button>
        </div>
      )}

      {/* Edit panel */}
      {showEditPanel && selected.size > 0 && (
        <div className="card border-white/20 space-y-4">
          <p className="text-white/50 text-xs uppercase tracking-widest">
            {t.bulkEdit.instruction.replace('{count}', String(selected.size))}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-white/50 text-xs mb-1 uppercase tracking-wide">{t.bulkEdit.startTime}</label>
              <input type="time" value={editForm.startTime}
                onChange={(e) => setEditForm((f) => ({ ...f, startTime: e.target.value }))}
                className="input-field text-sm py-2 text-left tracking-normal"
              />
            </div>
            <div>
              <label className="block text-white/50 text-xs mb-1 uppercase tracking-wide">{t.bulkEdit.endTime}</label>
              <input type="time" value={editForm.endTime}
                onChange={(e) => setEditForm((f) => ({ ...f, endTime: e.target.value }))}
                className="input-field text-sm py-2 text-left tracking-normal"
              />
            </div>
          </div>

          <div>
            <label className="block text-white/50 text-xs mb-1 uppercase tracking-wide">{t.bulkEdit.location}</label>
            <input type="text" value={editForm.location} placeholder={t.bulkEdit.locationPlaceholder}
              onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))}
              className="input-field text-sm py-2 text-left tracking-normal"
            />
          </div>

          <div>
            <label className="block text-white/50 text-xs mb-1 uppercase tracking-wide">{t.bulkEdit.category}</label>
            <div className="flex gap-2">
              {([
                { v: '' as const, l: t.bulkEdit.noChange },
                { v: 'FLAG' as const, l: t.common.flag },
                { v: 'TACKLE' as const, l: t.common.tackle },
                { v: 'CLEAR' as const, l: t.bulkEdit.clear },
              ]).map((opt) => (
                <button key={opt.v} type="button"
                  onClick={() => setEditForm((f) => ({ ...f, category: opt.v }))}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-display uppercase tracking-wide border transition-colors ${
                    editForm.category === opt.v ? 'bg-mk-gold text-mk-navy border-mk-gold' : 'text-white/40 border-white/20 hover:border-white/40'
                  }`}
                >{opt.l}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-white/50 text-xs mb-1 uppercase tracking-wide">{t.eventForm.notes}</label>
            <input type="text" value={editForm.notes} placeholder={t.bulkEdit.locationPlaceholder}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
              className="input-field text-sm py-2 text-left tracking-normal"
            />
          </div>

          {bulkUpdate.error && <p className="text-red-400 text-sm">{bulkUpdate.error.message}</p>}

          <button onClick={handleUpdate} disabled={isPending} className="btn-primary w-full">
            {bulkUpdate.isPending ? t.common.saving : t.bulkEdit.applyToEvents.replace('{count}', String(selected.size))}
          </button>
        </div>
      )}

      {/* Event list */}
      <div>
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 py-2 mb-1">
            <input type="checkbox" checked={allSelected} onChange={toggleAll}
              className="w-4 h-4 accent-mk-gold"
            />
            <span className="text-white/40 text-xs uppercase tracking-wide">
              {allSelected ? t.bulkEdit.deselectAll : t.bulkEdit.selectAll.replace('{count}', String(filtered.length))}
            </span>
          </div>
        )}

        <div className="space-y-1">
          {filtered.length === 0 && (
            <p className="text-white/30 text-sm py-4 text-center">{t.bulkEdit.noEvents}</p>
          )}
          {filtered.map((event) => {
            const isSelected = selected.has(event.id)
            const categoryLabel = event.category === 'FLAG' ? '🏴' : event.category === 'TACKLE' ? '🏈' : ''
            return (
              <button
                key={event.id}
                onClick={() => toggle(event.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors border ${
                  isSelected
                    ? 'bg-mk-gold/10 border-mk-gold/30'
                    : 'bg-white/5 border-transparent hover:border-white/10'
                }`}
              >
                <input type="checkbox" checked={isSelected} readOnly
                  className="w-4 h-4 accent-mk-gold flex-shrink-0 pointer-events-none"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs uppercase ${typeColor[event.type]}`}>{event.type}</span>
                    {categoryLabel && <span className="text-xs">{categoryLabel}</span>}
                    {event.status === 'CANCELLED' && <span className="text-xs text-red-400">{t.common.cancelled}</span>}
                  </div>
                  <p className="text-white/80 text-sm font-medium truncate">{event.title}</p>
                  <p className="text-white/40 text-xs">
                    {format(new Date(event.date), 'EEE d MMM')} · {event.startTime}
                    {event.endTime && `–${event.endTime}`}
                    {event.location && ` · ${event.location}`}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
