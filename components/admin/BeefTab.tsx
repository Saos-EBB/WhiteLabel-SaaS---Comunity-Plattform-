'use client'

import { useEffect, useState } from 'react'
import { Check, Loader2, Swords, X } from 'lucide-react'
import { fetchApi } from '@/lib/api'

interface PendingBeef {
  id: string
  initiator_id: string
  target_id: string
  tldr: string
  chat_passage: string
  created_at: string
  initiator_nickname: string | null
  target_nickname: string | null
}

function parsePassage(raw: string): { nickname: string; content: string }[] {
  return raw.split('\n').filter(Boolean).map(line => {
    const m = line.match(/^\[(.+?)\]: (.+)$/)
    return m ? { nickname: m[1], content: m[2] } : { nickname: '', content: line }
  })
}

interface Props {
  showToast: (msg: string, ok?: boolean) => void
  onCountChange: (count: number) => void
}

export function BeefTab({ onCountChange }: Props) {
  const [pendingBeefs, setPendingBeefs] = useState<PendingBeef[]>([])
  const [beefApproving, setBeefApproving] = useState<string | null>(null)

  async function loadPendingBeefs() {
    try {
      const data = await fetchApi<PendingBeef[]>('/hidden/beef/pending')
      const list = Array.isArray(data) ? data : []
      setPendingBeefs(list)
      onCountChange(list.length)
    } catch { /* non-critical */ }
  }

  async function handleBeefApprove(id: string) {
    setBeefApproving(id)
    try {
      await fetchApi(`/hidden/beef/${id}/approve`, { method: 'PATCH' })
      await loadPendingBeefs()
    } catch { }
    finally { setBeefApproving(null) }
  }

  async function handleBeefReject(id: string) {
    setBeefApproving(id)
    try {
      await fetchApi(`/hidden/beef/${id}/reject`, { method: 'DELETE' })
      await loadPendingBeefs()
    } catch { }
    finally { setBeefApproving(null) }
  }

  useEffect(() => {
    void loadPendingBeefs()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-on-surface">Beef Approvals</h2>
        <button
          onClick={() => void loadPendingBeefs()}
          className="text-xs text-on-surface-variant hover:text-on-surface"
        >
          Refresh
        </button>
      </div>

      {pendingBeefs.length === 0 ? (
        <div className="text-center py-12 text-on-surface-variant">
          <Swords size={36} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">Keine offenen Beef-Anfragen</p>
        </div>
      ) : pendingBeefs.map((beef) => (
        <div
          key={beef.id}
          className="bg-surface-container border border-outline-variant rounded-2xl p-5 flex flex-col gap-3"
        >
          <div>
            <span className="text-xs text-on-surface-variant uppercase tracking-widest font-mono">
              Beef Anfrage
            </span>
            <div className="flex items-center gap-2 mt-2 text-sm">
              <span className="font-bold text-on-surface">
                {beef.initiator_nickname ?? '???'}
              </span>
              <Swords size={14} className="text-primary-fixed-dim" />
              <span className="font-bold text-on-surface">
                {beef.target_nickname ?? '???'}
              </span>
            </div>
            <p className="font-bold text-on-surface mt-2 text-lg">{beef.tldr}</p>
          </div>
          <div className="bg-surface-container-low rounded-xl p-3 border-l-2 border-outline-variant">
            <p className="text-xs text-on-surface-variant mb-2">Passage</p>
            <div className="flex flex-col gap-1.5">
              {parsePassage(beef.chat_passage).map((line, i) => {
                const isTarget = beef.target_nickname != null && line.nickname === beef.target_nickname
                return (
                  <div key={i} className={`flex flex-col gap-0.5 ${isTarget ? 'items-end' : 'items-start'}`}>
                    <span className="text-[10px] font-semibold text-on-surface-variant px-1">
                      {line.nickname || '?'}
                    </span>
                    <div className={`max-w-[85%] px-3 py-1.5 rounded-2xl text-sm leading-snug ${
                      isTarget
                        ? 'rounded-br-sm bg-surface-container-high text-on-surface'
                        : 'rounded-bl-sm bg-primary-fixed-dim/15 text-on-surface'
                    }`}>
                      {line.content}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-on-surface-variant font-mono">
              {new Date(beef.created_at).toLocaleString('de-AT')}
            </span>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => void handleBeefReject(beef.id)}
                disabled={beefApproving === beef.id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-container-high border border-outline-variant text-on-surface-variant font-semibold text-sm disabled:opacity-40 transition-opacity"
              >
                <X size={14} /> Ablehnen
              </button>
              <button
                onClick={() => void handleBeefApprove(beef.id)}
                disabled={beefApproving === beef.id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-fixed-dim text-on-primary-container font-semibold text-sm disabled:opacity-40 transition-opacity"
              >
                {beefApproving === beef.id
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Check size={14} />}
                Approve
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
