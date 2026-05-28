'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import {
  AlertCircle, BookOpen, Check, Crown, FileText,
  Image as ImageIcon, Inbox, Shield, Swords, Users, Zap,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { useHiddenStore } from '@/lib/store/hiddenStore'
import BanModal from '@/components/ui/BanModal'
import { useTranslation } from '@/lib/i18n'
import type { BanInfo } from '@/components/admin/shared/types'

// ─── Tab components (lazy-loaded) ─────────────────────────────────────────────

const TicketsTab   = dynamic(() => import('@/components/admin/TicketsTab').then((m) => m.TicketsTab),   { ssr: false })
const MediaTab     = dynamic(() => import('@/components/admin/MediaTab').then((m) => m.MediaTab),       { ssr: false })
const UsersTab     = dynamic(() => import('@/components/admin/UsersTab').then((m) => m.UsersTab),       { ssr: false })
const ReportsTab   = dynamic(() => import('@/components/admin/ReportsTab').then((m) => m.ReportsTab),   { ssr: false })
const StrikesTab   = dynamic(() => import('@/components/admin/StrikesTab').then((m) => m.StrikesTab),   { ssr: false })
const ProfanityTab = dynamic(() => import('@/components/admin/ProfanityTab').then((m) => m.ProfanityTab), { ssr: false })
const SettingsTab  = dynamic(() => import('@/components/admin/SettingsTab').then((m) => m.SettingsTab), { ssr: false })
const VerwaltungTab = dynamic(() => import('@/components/admin/VerwaltungTab').then((m) => m.VerwaltungTab), { ssr: false })
const BeefTab      = dynamic(() => import('@/components/admin/BeefTab').then((m) => m.BeefTab),         { ssr: false })

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getJwtRole(token: string | null): string | null {
  if (!token) return null
  try {
    const part = token.split('.')[1]
    if (!part) return null
    const decoded = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as { role?: string }
    return decoded.role ?? null
  } catch {
    return null
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AdminTab = 'tickets' | 'media' | 'users' | 'reports' | 'strikes' | 'profanity' | 'settings' | 'verwaltung' | 'beef'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { accessToken } = useAuthStore()
  const isHidden = useHiddenStore((s) => s.isHidden)

  const [activeTab, setActiveTab] = useState<AdminTab>('tickets')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [hydrated, setHydrated] = useState(false)
  const [banModal, setBanModal] = useState<BanInfo | null>(null)
  const [banTrigger, setBanTrigger] = useState(0)
  const [usersBanMap, setUsersBanMap] = useState<Record<string, { is_banned: boolean; ban_reason: string | null }>>({})
  const [pendingBeefsCount, setPendingBeefsCount] = useState(0)

  useEffect(() => {
    if (useAuthStore.persist.hasHydrated()) {
      setHydrated(true)
    } else {
      const unsub = useAuthStore.persist.onFinishHydration(() => setHydrated(true))
      return unsub
    }
  }, [])

  const role = getJwtRole(accessToken)
  const isOwner = role === 'owner'

  useEffect(() => {
    if (!hydrated) return
    if (role !== 'admin' && role !== 'owner') {
      router.replace('/dashboard')
    }
  }, [hydrated, accessToken, role, router])

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

  useEffect(() => {
    if (role !== 'admin' && role !== 'owner') return
    fetchApi<{ id: string }[]>('/hidden/beef/pending')
      .then((data) => setPendingBeefsCount(Array.isArray(data) ? data.length : 0))
      .catch(() => {})
  }, [role])

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  function onBanOpen(info: BanInfo) {
    setBanModal(info)
  }

  function onBanMapUpdate(updates: Record<string, { is_banned: boolean; ban_reason: string | null }>) {
    setUsersBanMap((prev) => ({ ...prev, ...updates }))
  }

  const TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
    { key: 'tickets',   label: t.admin.tabTickets,   icon: <Inbox className="h-4 w-4" /> },
    { key: 'media',     label: t.admin.tabMedia,     icon: <ImageIcon className="h-4 w-4" /> },
    { key: 'users',     label: t.admin.tabUsers,     icon: <Users className="h-4 w-4" /> },
    { key: 'reports',   label: t.admin.tabReports,   icon: <FileText className="h-4 w-4" /> },
    { key: 'strikes',   label: t.admin.tabStrikes,   icon: <Zap className="h-4 w-4" /> },
    { key: 'profanity', label: t.admin.tabProfanity, icon: <BookOpen className="h-4 w-4" /> },
    ...(isOwner
      ? [{ key: 'verwaltung' as AdminTab, label: t.admin.tabManagement, icon: <Crown className="h-4 w-4" /> }]
      : []
    ),
  ]

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-8">

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg text-sm font-medium pointer-events-none ${
            toast.ok
              ? 'bg-surface-container-high text-on-surface'
              : 'bg-error-container text-error'
          }`}
        >
          {toast.ok
            ? <Check className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />}
          {toast.msg}
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">

        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-on-surface-variant" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-on-surface">Admin</h1>
          {isOwner && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Owner
            </span>
          )}
        </div>

        {/* Tab bar */}
        <div className="rounded-2xl bg-surface-container border border-outline-variant p-1 flex gap-1 overflow-x-auto">
          {TABS.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              aria-pressed={activeTab === key}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === key
                  ? 'bg-primary-fixed-dim text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
          {(isHidden || role === 'admin' || role === 'owner') && (
            <button
              onClick={() => setActiveTab('beef')}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors min-h-[44px] ${
                activeTab === 'beef'
                  ? 'bg-primary-fixed-dim text-on-primary-container'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
              }`}
            >
              <Swords size={15} />
              <span className="hidden sm:inline">Beef</span>
              {pendingBeefsCount > 0 && (
                <span className="bg-error text-on-error text-[10px] font-bold px-1.5 rounded-full">
                  {pendingBeefsCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Tab panels */}
        {activeTab === 'tickets'    && <TicketsTab showToast={showToast} />}
        {activeTab === 'media'      && <MediaTab showToast={showToast} />}
        {activeTab === 'users'      && (
          <UsersTab
            showToast={showToast}
            onBanOpen={onBanOpen}
            onBanMapUpdate={onBanMapUpdate}
            banTrigger={banTrigger}
          />
        )}
        {activeTab === 'reports'    && (
          <ReportsTab
            showToast={showToast}
            onBanOpen={onBanOpen}
            usersBanMap={usersBanMap}
            banTrigger={banTrigger}
          />
        )}
        {activeTab === 'strikes'    && <StrikesTab showToast={showToast} />}
        {activeTab === 'profanity'  && <ProfanityTab showToast={showToast} />}
        {activeTab === 'settings'   && <SettingsTab showToast={showToast} />}
        {activeTab === 'verwaltung' && <VerwaltungTab showToast={showToast} isOwner={isOwner} />}
        {activeTab === 'beef'       && (
          <BeefTab
            showToast={showToast}
            onCountChange={setPendingBeefsCount}
          />
        )}

      </div>

      {/* Cross-tab modal: ban */}
      {banModal && (
        <BanModal
          userId={banModal.userId}
          nickname={banModal.nickname}
          reportId={banModal.reportId}
          onSuccess={() => {
            showToast(t.admin.toastUserBanned)
            setBanModal(null)
            setBanTrigger((n) => n + 1)
          }}
          onClose={() => setBanModal(null)}
        />
      )}

    </main>
  )
}
