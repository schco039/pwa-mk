'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { useT } from '@/i18n/client'

interface Doc {
  id: string
  title: string
  category: string
  downloadable: boolean
  uploadedAt: Date
}

const CATEGORY_ORDER = ['Playbook', 'Reglement', 'Trainingsplan', 'Sonstiges']

export function DocumentViewer({ docs }: { docs: Doc[] }) {
  const t = useT()
  const [openId, setOpenId] = useState<string | null>(null)

  if (docs.length === 0) {
    return <p className="text-white/30 text-sm">{t.documents.noDocumentsAvailable}</p>
  }

  // Group by category
  const grouped = CATEGORY_ORDER.map((cat) => ({
    cat,
    items: docs.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0)

  // Also catch unknown categories
  const knownCats = new Set(CATEGORY_ORDER)
  const other = docs.filter((d) => !knownCats.has(d.category))
  if (other.length > 0) grouped.push({ cat: 'Sonstiges', items: other })

  return (
    <div className="space-y-5">
      {grouped.map(({ cat, items }) => (
        <div key={cat} className="card space-y-2">
          <h2 className="font-display text-sm uppercase tracking-widest text-white/40 mb-3">{cat}</h2>
          {items.map((doc) => (
            <div key={doc.id}>
              <div className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="text-white/90 text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-white/40 text-xs">{format(new Date(doc.uploadedAt), 'd MMM yyyy')}</p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    onClick={() => setOpenId(openId === doc.id ? null : doc.id)}
                    className="btn-ghost text-xs py-1 px-3"
                  >
                    {openId === doc.id ? t.common.close : t.common.open}
                  </button>
                  {doc.downloadable && (
                    <a
                      href={`/api/docs/${doc.id}`}
                      download
                      className="btn-primary text-xs py-1 px-3"
                    >
                      ↓
                    </a>
                  )}
                </div>
              </div>
              {openId === doc.id && (
                <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black">
                  <iframe
                    src={`/api/docs/${doc.id}`}
                    className="w-full h-[70vh]"
                    title={doc.title}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
