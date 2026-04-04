'use client'

import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'
import { useT } from '@/i18n/client'

export function PushAdminPanel() {
  const t = useT()
  const utils = trpc.useUtils()
  const { data: settings } = trpc.pushAdmin.getSettings.useQuery()
  const { data: logs = [] } = trpc.pushAdmin.getLogs.useQuery({ limit: 100 })

  const update = trpc.pushAdmin.updateSettings.useMutation({
    onSuccess: () => utils.pushAdmin.getSettings.invalidate(),
  })

  const PUSH_TYPES = [
    { key: 'training24h' as const, label: t.push.training24h, desc: t.push.training24hDesc },
    { key: 'training2h' as const, label: t.push.training2h, desc: t.push.training2hDesc },
    { key: 'game24h' as const, label: t.push.game24h, desc: t.push.game24hDesc },
    { key: 'eventMessage' as const, label: t.push.eventMessage, desc: t.push.eventMessageDesc },
  ]

  const TYPE_LABELS: Record<string, string> = {
    TRAINING_24H: t.push.type24hTraining,
    TRAINING_2H: t.push.type2hTraining,
    GAME_24H: t.push.type24hGame,
    EVENT_MESSAGE: t.push.typeEventMessage,
  }

  type SettingKey = 'training24h' | 'training2h' | 'game24h' | 'eventMessage'
  function toggle(key: SettingKey, current: boolean) {
    update.mutate({ [key]: !current })
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/40">{t.push.automaticPushes}</h2>
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
                className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors duration-200 disabled:opacity-40 ${
                  active ? 'bg-mk-gold' : 'bg-white/20'
                }`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-200 ${
                  active ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>
          )
        })}
      </div>

      <div className="card space-y-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/40">
          {t.push.history} <span className="text-white/20 font-normal normal-case tracking-normal">({t.push.entries.replace('{count}', String(logs.length))})</span>
        </h2>
        {logs.length === 0 && (
          <p className="text-white/30 text-sm">{t.push.noPushes}</p>
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

      <div className="card bg-white/5 space-y-2">
        <h2 className="font-display text-xs uppercase tracking-widest text-white/30">{t.push.allPushTypes}</h2>
        <div className="space-y-1.5 text-xs text-white/50">
          <p>{t.push.info24hTraining}</p>
          <p>{t.push.info2hTraining}</p>
          <p>{t.push.info24hGame}</p>
          <p>{t.push.infoEventMessage}</p>
        </div>
      </div>
    </div>
  )
}
