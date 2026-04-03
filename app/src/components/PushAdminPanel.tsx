'use client'

import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'

const PUSH_TYPES = [
  {
    key: 'training24h' as const,
    label: '24h vor Training',
    desc: 'Spieler ohne RSVP erhalten eine Erinnerung',
  },
  {
    key: 'training2h' as const,
    label: '2h vor Training',
    desc: 'Spieler die YES gesagt haben erhalten einen Reminder',
  },
  {
    key: 'game24h' as const,
    label: '24h vor Spiel',
    desc: 'Spieler ohne RSVP werden auf das Spiel hingewiesen',
  },
  {
    key: 'eventMessage' as const,
    label: 'Event-Nachrichten',
    desc: 'Coach/Comité kann Nachrichten an YES-RSVPs senden',
  },
]

const TYPE_LABELS: Record<string, string> = {
  TRAINING_24H:  '24h Training',
  TRAINING_2H:   '2h Training',
  GAME_24H:      '24h Spiel',
  EVENT_MESSAGE: 'Event-Nachricht',
}

export function PushAdminPanel() {
  const utils = trpc.useUtils()
  const { data: settings } = trpc.pushAdmin.getSettings.useQuery()
  const { data: logs = [] } = trpc.pushAdmin.getLogs.useQuery({ limit: 100 })

  const update = trpc.pushAdmin.updateSettings.useMutation({
    onSuccess: () => utils.pushAdmin.getSettings.invalidate(),
  })

  type SettingKey = 'training24h' | 'training2h' | 'game24h' | 'eventMessage'
  function toggle(key: SettingKey, current: boolean) {
    update.mutate({ [key]: !current })
  }

  return (
    <div className="space-y-6">
      {/* Toggles */}
      <div className="card space-y-4">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/40">Automatische Pushes</h2>
        {PUSH_TYPES.map((pt) => {
          const active = settings ? (settings[pt.key] as boolean) : true
          return (
            <div key={pt.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white/80 font-medium">{pt.label}</p>
                <p className="text-xs text-white/40">{pt.desc}</p>
              </div>
              <button
                onClick={() => toggle(pt.key, active)}
                disabled={update.isPending || !settings}
                className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-40 ${
                  active ? 'bg-mk-gold' : 'bg-white/20'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  active ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Log */}
      <div className="card space-y-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/40">
          Verlauf <span className="text-white/20 font-normal normal-case tracking-normal">({logs.length} Einträge)</span>
        </h2>
        {logs.length === 0 && (
          <p className="text-white/30 text-sm">Noch keine Pushes gesendet.</p>
        )}
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
              <span className="text-xs text-white/30 flex-shrink-0 w-28 mt-0.5">
                {format(new Date(log.sentAt), 'd MMM HH:mm')}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-mk-gold/10 text-mk-gold border border-mk-gold/20">
                    {TYPE_LABELS[log.type] ?? log.type}
                  </span>
                  <span className="text-xs text-white/70 font-medium truncate">{log.title}</span>
                </div>
                <p className="text-xs text-white/40 truncate mt-0.5">{log.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info box */}
      <div className="card bg-white/5 space-y-2">
        <h2 className="font-display text-xs uppercase tracking-widest text-white/30">Alle Push-Typen</h2>
        <div className="space-y-1.5 text-xs text-white/50">
          <p>🏈 <strong className="text-white/60">24h vor Training</strong> — Spieler ohne RSVP</p>
          <p>⏰ <strong className="text-white/60">2h vor Training</strong> — Spieler mit YES</p>
          <p>🏆 <strong className="text-white/60">24h vor Spiel</strong> — Spieler ohne RSVP</p>
          <p>📣 <strong className="text-white/60">Event-Nachricht</strong> — manuell, nur YES-RSVPs</p>
        </div>
      </div>
    </div>
  )
}
