'use client'

import { trpc } from '@/lib/trpc'
import { useT } from '@/i18n/client'

interface Props {
  eventId: string
  currentUserId: string
  isOnRoster: boolean
}

export function MvpVoting({ eventId, currentUserId, isOnRoster }: Props) {
  const t = useT()
  const utils = trpc.useUtils()
  const { data: roster = [] } = trpc.roster.get.useQuery({ eventId })
  const { data: mvp } = trpc.mvp.results.useQuery({ eventId })

  const vote = trpc.mvp.vote.useMutation({
    onSuccess: () => utils.mvp.results.invalidate({ eventId }),
  })

  if (roster.length === 0) return <p className="text-white/30 text-sm">{t.mvp.noRosterForVoting}</p>

  const winner = mvp?.results[0]
  const myVote = mvp?.myVoteNomineeId

  return (
    <div className="space-y-4">
      {mvp && mvp.results.length > 0 && (
        <div className="space-y-2">
          {mvp.results.slice(0, 5).map((r) => (
            <div key={r.user.id} className="flex items-center gap-2">
              <div className="w-24 min-w-0 text-right">
                <span className="text-xs text-white/60 truncate block">
                  {r.user.jerseyNumber ? `#${r.user.jerseyNumber} ` : ''}{r.user.name.split(' ')[0]}
                </span>
              </div>
              <div className="flex-1 bg-white/5 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${r.user.id === winner?.user.id ? 'bg-mk-gold' : 'bg-white/20'}`}
                  style={{ width: `${mvp.totalVotes ? (r.count / mvp.totalVotes) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs text-white/40 w-4 text-right">{r.count}</span>
            </div>
          ))}
          {mvp.totalVotes > 0 && (
            <p className="text-white/30 text-xs">{t.mvp.votesTotal.replace('{count}', String(mvp.totalVotes))}</p>
          )}
        </div>
      )}

      {isOnRoster && (
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest mb-2">
            {myVote ? t.mvp.changeVote : t.mvp.castVote}
          </p>
          <div className="flex flex-wrap gap-2">
            {roster
              .filter((r) => r.userId !== currentUserId)
              .map((r) => (
                <button
                  key={r.userId}
                  onClick={() => vote.mutate({ eventId, nomineeId: r.userId })}
                  disabled={vote.isPending}
                  className={`text-xs px-3 py-1.5 rounded border transition-colors disabled:opacity-40 ${
                    myVote === r.userId
                      ? 'border-mk-gold text-mk-gold bg-mk-gold/10'
                      : 'border-white/20 text-white/60 hover:border-white/40'
                  }`}
                >
                  {r.user.jerseyNumber ? `#${r.user.jerseyNumber} ` : ''}{r.user.name.split(' ')[0]}
                </button>
              ))}
          </div>
        </div>
      )}
      {!isOnRoster && <p className="text-white/30 text-xs">{t.mvp.onlyRosterCanVote}</p>}
    </div>
  )
}
