'use client'

import { useState, useRef } from 'react'
import { trpc } from '@/lib/trpc'
import { format } from 'date-fns'

const CATEGORIES = ['Playbook', 'Reglement', 'Trainingsplan', 'Sonstiges']

export function DocumentsAdmin() {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [downloadable, setDownloadable] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const utils = trpc.useUtils()

  const { data: docs = [], isLoading } = trpc.documents.list.useQuery()

  const remove = trpc.documents.delete.useMutation({
    onSuccess: () => utils.documents.list.invalidate(),
  })
  const toggleDownload = trpc.documents.toggleDownloadable.useMutation({
    onSuccess: () => utils.documents.list.invalidate(),
  })

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file || !title.trim()) return
    setUploading(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('title', title.trim())
      fd.append('category', category)
      fd.append('downloadable', String(downloadable))
      const res = await fetch('/api/docs/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setTitle('')
      setDownloadable(false)
      if (fileRef.current) fileRef.current.value = ''
      utils.documents.list.invalidate()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Upload form */}
      <div className="card space-y-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/40">Dokument hochladen</h2>
        <input
          type="text"
          placeholder="Titel"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="input w-full text-sm"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input w-full text-sm"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="text-sm text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-mk-gold file:text-mk-navy file:text-xs file:font-semibold cursor-pointer"
        />
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={downloadable}
            onChange={(e) => setDownloadable(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm text-white/60">Download erlauben</span>
        </label>
        {error && <p className="text-red-400 text-xs">{error}</p>}
        <button
          onClick={handleUpload}
          disabled={uploading || !title.trim() || !fileRef.current?.files?.length}
          className="btn-primary text-sm py-2 px-4 disabled:opacity-40"
        >
          {uploading ? 'Hochladen…' : 'Hochladen'}
        </button>
      </div>

      {/* Document list */}
      <div className="card space-y-3">
        <h2 className="font-display text-sm uppercase tracking-widest text-white/40">Alle Dokumente</h2>
        {isLoading && <p className="text-white/30 text-sm">Loading…</p>}
        {!isLoading && docs.length === 0 && <p className="text-white/30 text-sm">Noch keine Dokumente.</p>}
        {docs.map((doc) => (
          <div key={doc.id} className="bg-mk-navy-dark rounded-lg p-3 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-white/90 text-sm font-medium truncate">{doc.title}</p>
                <p className="text-white/40 text-xs">
                  {doc.category} · {format(new Date(doc.uploadedAt), 'd MMM yyyy')}
                  {doc.downloadable
                    ? <span className="text-green-400 ml-2">↓ downloadable</span>
                    : <span className="text-yellow-400/70 ml-2">view only</span>
                  }
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleDownload.mutate({ id: doc.id, downloadable: !doc.downloadable })}
                  className="text-white/40 hover:text-white text-xs"
                  title="Toggle download"
                >
                  {doc.downloadable ? '🔒' : '🔓'}
                </button>
                <button
                  onClick={() => remove.mutate({ id: doc.id })}
                  disabled={remove.isPending}
                  className="text-red-400/70 hover:text-red-400 text-xs disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </div>
            <a
              href={`/api/docs/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mk-gold text-xs underline"
            >
              Vorschau
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
