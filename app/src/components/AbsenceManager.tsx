'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'

export function AbsenceManager() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [reason, setReason] = useState('')
  const utils = trpc.useUtils()

  const { data: absences = [], isLoading } = trpc.absences.list.useQuery()

  const create = trpc.absences.create.useMutation({
    onSuccess: () => {
      setFrom('')
      setTo('')
      setReason('')
      utils.absences.list.invalidate()
    },
  })

  const remove = trpc.absences.delete.useMutation({
    onSuccess: () => utils.absences.list.invalidate(),
  })

  return (
    <div className="space-y-4">
      {/* Absence list */}
      {isLoading ? (
        <p className="text-white/30 text-sm">Loading…</p>
      ) : absences.length === 0 ? (
        <p className="text-white/30 text-sm">No absences registered.</p>
      ) : (
        <div className="space-y-2">
          {absences.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 bg-mk-navy-dark rounded-lg px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm text-white/80">
                  {format(new Date(a.from), 'd MMM')} – {format(new Date(a.to), 'd MMM yyyy')}
                </p>
                {a.reason && <p className="text-xs text-white/40 truncate">{a.reason}</p>}
              </div>
              <button
                onClick={() => remove.mutate({ id: a.id })}
                disabled={remove.isPending}
                className="text-red-400/70 hover:text-red-400 text-xs flex-shrink-0 disabled:opacity-40"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add absence form */}
      <div className="space-y-2 pt-2 border-t border-white/10">
        <p className="text-xs uppercase tracking-widest text-white/30">Add absence</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-white/40 mb-1 block">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-white/40 mb-1 block">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="input w-full text-sm"
            />
          </div>
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional) — vacation, injury…"
          maxLength={200}
          className="input w-full text-sm"
        />
        <button
          onClick={() => create.mutate({ from, to, reason: reason || undefined })}
          disabled={!from || !to || create.isPending}
          className="btn-primary text-sm py-1.5 px-4 disabled:opacity-40"
        >
          {create.isPending ? 'Saving…' : 'Save'}
        </button>
        {create.isError && (
          <p className="text-red-400 text-xs">{create.error.message}</p>
        )}
      </div>
    </div>
  )
}
