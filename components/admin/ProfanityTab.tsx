'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useTranslation } from '@/lib/i18n'
import { Divider } from './shared/Divider'
import { Spinner } from './shared/Spinner'
import { ModalOverlay } from './shared/ModalOverlay'
import { btnPrimary, btnOutline, fmtDate } from './shared/utils'
import type { ProfanityWord } from './shared/types'

interface Props {
  showToast: (msg: string, ok?: boolean) => void
}

export function ProfanityTab({ showToast }: Props) {
  const { t } = useTranslation()

  const [profanity, setProfanity] = useState<ProfanityWord[]>([])
  const [profanityLoading, setProfanityLoading] = useState(false)
  const [addWord, setAddWord] = useState('')
  const [addWordSaving, setAddWordSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleteSaving, setDeleteSaving] = useState(false)

  async function loadProfanity() {
    setProfanityLoading(true)
    try {
      const data = await fetchApi<ProfanityWord[]>('/admin/profanity')
      setProfanity(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.admin.loadError, false)
    } finally {
      setProfanityLoading(false)
    }
  }

  async function submitAddWord() {
    if (!addWord.trim()) return
    setAddWordSaving(true)
    try {
      await fetchApi<void>('/admin/profanity', {
        method: 'POST',
        body: JSON.stringify({ word: addWord.trim() }),
      })
      setAddWord('')
      showToast(t.admin.toastWordAdded)
      await loadProfanity()
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setAddWordSaving(false)
    }
  }

  async function submitDeleteWord() {
    if (!deleteConfirm) return
    setDeleteSaving(true)
    try {
      await fetchApi<void>(`/admin/profanity/${encodeURIComponent(deleteConfirm)}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      showToast(t.admin.toastWordRemoved)
      await loadProfanity()
    } catch (err) {
      showToast(err instanceof Error ? err.message : t.common.error, false)
    } finally {
      setDeleteSaving(false)
    }
  }

  useEffect(() => {
    void loadProfanity()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">

      <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
        {t.admin.profanityTitle}
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder={t.admin.profanityNewWord}
          value={addWord}
          onChange={(e) => setAddWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') void submitAddWord() }}
          className="flex-1 px-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim min-h-[40px]"
        />
        <button
          onClick={() => void submitAddWord()}
          disabled={addWordSaving || !addWord.trim()}
          className="px-3 py-2 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[40px] disabled:opacity-50 flex items-center gap-1.5"
        >
          {addWordSaving ? <Spinner size={4} /> : <Plus className="h-4 w-4" />}
          {t.admin.profanityAdd}
        </button>
      </div>

      <Divider />

      {profanityLoading ? (
        <div className="flex justify-center py-8"><Spinner size={6} /></div>
      ) : profanity.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-8">{t.admin.profanityNone}</p>
      ) : (
        <div className="space-y-2">
          {profanity.map((w) => (
            <div
              key={w.word}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-surface-container-high border border-outline-variant"
            >
              <div className="min-w-0">
                <p className="text-sm font-mono font-medium text-on-surface">{w.word}</p>
                <p className="text-xs text-on-surface-variant">
                  {fmtDate(w.added_at)}
                  {w.added_by && ` · ${w.added_by.slice(0, 8)}`}
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(w.word)}
                className="p-2 rounded-lg text-error hover:bg-error-container transition-colors flex-shrink-0"
                aria-label={t.admin.profanityRemoveAriaLabel.replace('{word}', w.word)}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <ModalOverlay title={t.admin.removeWordTitle} onClose={() => setDeleteConfirm(null)}>
          <p className="text-sm text-on-surface-variant">
            {t.admin.removeWordDesc.split('{word}')[0]}
            <span className="font-mono font-semibold text-on-surface">{deleteConfirm}</span>
            {t.admin.removeWordDesc.split('{word}')[1]}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <button
              onClick={() => void submitDeleteWord()}
              disabled={deleteSaving}
              className={`${btnPrimary} flex-1 justify-center bg-error-container text-error`}
            >
              {deleteSaving && <Spinner size={4} />}
              {t.admin.removeWordConfirm}
            </button>
            <button onClick={() => setDeleteConfirm(null)} className={`${btnOutline} flex-1 justify-center`}>
              {t.common.cancel}
            </button>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}
