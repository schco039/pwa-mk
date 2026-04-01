'use client'

import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'

export function DeleteTeamButton({ teamId, teamName }: { teamId: string; teamName: string }) {
  const router = useRouter()
  const del = trpc.teams.delete.useMutation({ onSuccess: () => router.refresh() })

  return (
    <button
      onClick={() => {
        if (confirm(`Delete "${teamName}"?`)) del.mutate({ id: teamId })
      }}
      disabled={del.isPending}
      className="text-red-400/50 hover:text-red-400 text-xs uppercase tracking-wide transition-colors"
    >
      Delete
    </button>
  )
}
