'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { trpc } from '@/lib/trpc'
import { useT } from '@/i18n/client'

interface TeamFormProps {
  initial?: {
    id: string
    name: string
    shortName?: string | null
    location?: string | null
    logoUrl?: string | null
    notes?: string | null
  }
}

export function TeamForm({ initial }: TeamFormProps) {
  const t = useT()
  const router = useRouter()
  const isEdit = !!initial
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    shortName: initial?.shortName ?? '',
    location: initial?.location ?? '',
    logoUrl: initial?.logoUrl ?? '',
    notes: initial?.notes ?? '',
  })

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Upload failed')
      setForm((f) => ({ ...f, logoUrl: json.url }))
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const create = trpc.teams.create.useMutation({ onSuccess: () => router.push('/coach/teams') })
  const update = trpc.teams.update.useMutation({ onSuccess: () => router.push('/coach/teams') })
  const isPending = create.isPending || update.isPending
  const error = create.error?.message || update.error?.message

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const data = {
      name: form.name,
      shortName: form.shortName || undefined,
      location: form.location || undefined,
      logoUrl: form.logoUrl || undefined,
      notes: form.notes || undefined,
    }
    if (isEdit) update.mutate({ id: initial!.id, ...data })
    else create.mutate(data)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">{t.teamForm.name}</label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={t.teamForm.namePlaceholder}
          className="input-field text-left tracking-normal"
          required
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">{t.teamForm.shortName}</label>
        <input
          type="text"
          value={form.shortName}
          onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))}
          placeholder={t.teamForm.shortNamePlaceholder}
          className="input-field text-left tracking-normal"
          maxLength={10}
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">{t.teamForm.city}</label>
        <input
          type="text"
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          placeholder={t.teamForm.cityPlaceholder}
          className="input-field text-left tracking-normal"
        />
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">{t.teamForm.logo}</label>
        <div className="flex items-center gap-3">
          {form.logoUrl && (
            <img src={form.logoUrl} alt="preview" className="w-14 h-14 object-contain rounded-lg bg-white/5 flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="btn-ghost text-sm py-2 w-full"
            >
              {uploading ? t.teamForm.uploading : form.logoUrl ? t.teamForm.replaceImage : t.teamForm.uploadImage}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileUpload}
              className="hidden"
            />
            <input
              type="url"
              value={form.logoUrl}
              onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))}
              placeholder={t.teamForm.urlPlaceholder}
              className="input-field text-left tracking-normal text-sm py-2"
            />
          </div>
        </div>
        {uploadError && <p className="text-red-400 text-xs mt-1">{uploadError}</p>}
      </div>

      <div>
        <label className="block text-white/60 text-sm mb-2 uppercase tracking-wide">{t.teamForm.notes}</label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder={t.teamForm.notesPlaceholder}
          className="input-field text-left tracking-normal resize-none"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="btn-primary flex-1">
          {isPending ? t.common.saving : isEdit ? t.eventForm.saveChanges : t.teamForm.createTeam}
        </button>
        <button type="button" onClick={() => router.back()} className="btn-ghost">{t.common.cancel}</button>
      </div>
    </form>
  )
}
