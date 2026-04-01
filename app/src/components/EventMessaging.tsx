'use client'

import { useState } from 'react'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'

interface Props {
  eventId: string
  canSend: boolean
}

export function EventMessaging({ eventId, canSend }: Props) {
  const [body, setBody] = useState('')
  const utils = trpc.useUtils()

  const { data: messages = [], isLoading } = trpc.messages.list.useQuery({ eventId })

  const send = trpc.messages.send.useMutation({
    onSuccess: () => {
      setBody('')
      utils.messages.list.invalidate({ eventId })
    },
  })

  return (
    <div className="space-y-4">
      {/* Messages list */}
      {isLoading ? (
        <p className="text-white/30 text-sm">Loading…</p>
      ) : messages.length === 0 ? (
        <p className="text-white/30 text-sm">No messages yet.</p>
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div key={msg.id} className="bg-mk-navy-dark rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-mk-gold">{msg.author.name}</span>
                <span className="text-xs text-white/30">
                  {format(new Date(msg.sentAt), 'd MMM HH:mm')}
                </span>
              </div>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{msg.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Compose (COMITE / COACH only) */}
      {canSend && (
        <div className="space-y-2">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Message to all YES RSVPs…"
            maxLength={500}
            rows={3}
            className="input w-full resize-none text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-white/30">{body.length}/500</span>
            <button
              onClick={() => send.mutate({ eventId, body })}
              disabled={!body.trim() || send.isPending}
              className="btn-primary text-sm py-1.5 px-4 disabled:opacity-40"
            >
              {send.isPending ? 'Sending…' : 'Send Push'}
            </button>
          </div>
          {send.isError && (
            <p className="text-red-400 text-xs">{send.error.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
