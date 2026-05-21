'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Type, Globe, Bell, Eye, Check, AlertCircle, Loader2, ChevronDown, Lock, LogOut, Download, CreditCard, Flag, Shield, User,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAccessibilityStore } from '@/lib/store/accessibilityStore'
import { useAuthStore } from '@/lib/store/authStore'
import { useThemeStore } from '@/lib/store/themeStore'
import StripeCheckoutModal from '@/components/ui/StripeCheckoutModal'
import ReportModal from '@/components/ui/ReportModal'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

// ─── Types ────────────────────────────────────────────────────────────────────

type FontSize = 'normal' | 'large' | 'xl'
type AccordionSection = 'design' | 'notifications' | 'visibility' | 'account' | 'security' | 'payment' | 'support'

interface BlockedUser {
  block_id: string
  user_id: string
  nickname: string
  photo_url: string | null
}

interface Subscription {
  plan: string
  status: string
  current_period_end: string | null
}

interface SubDetail {
  id: string
  plan: string
  status: string
  expires_at: string | null
}

interface Profile {
  id: string
  font_size: FontSize
  high_contrast: boolean
  lang_simple: boolean
  profanity_filter: boolean
  is_published: boolean
  onboarding_completed: boolean
  status_visible: boolean
  show_bio: boolean
  show_city: boolean
  show_age: boolean
  show_gender: boolean
  show_interests: boolean
  show_audio: boolean
  subscription: Subscription | null
}

interface NotifSettings {
  email_messages: boolean
  email_matches: boolean
  email_system: boolean
  push_messages: boolean
  push_matches: boolean
  push_system: boolean
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({
  id, checked, onChange, disabled,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-fixed-dim focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'bg-primary-fixed-dim' : 'bg-surface-container-high'
      }`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-sm ring-0 transition duration-200 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

// ─── ToggleRow ────────────────────────────────────────────────────────────────

function ToggleRow({
  id, label, description, checked, onChange, saving, disabled,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  saving?: boolean
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <label
          htmlFor={id}
          className={`text-sm font-medium cursor-pointer select-none ${disabled ? 'text-on-surface-variant' : 'text-on-surface'}`}
        >
          {label}
        </label>
        {description && (
          <p className="text-xs text-on-surface-variant mt-0.5">{description}</p>
        )}
      </div>
      {saving ? (
        <Loader2 className="h-5 w-5 text-on-surface-variant animate-spin flex-shrink-0" aria-hidden="true" />
      ) : (
        <Toggle id={id} checked={checked} onChange={onChange} disabled={disabled} />
      )}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-outline-variant" />
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
      {children}
    </p>
  )
}

// ─── AccordionItem ────────────────────────────────────────────────────────────

function AccordionItem({
  title, icon, isOpen, onToggle, children,
}: {
  title: string
  icon: ReactNode
  isOpen: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-4 text-left min-h-[56px]"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-on-surface">
          {icon}
          {title}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-on-surface-variant flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-outline-variant px-4 sm:px-5 pt-4 pb-5 space-y-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ComingSoonBadge ─────────────────────────────────────────────────────────

function ComingSoonBadge() {
  return (
    <span className="text-xs px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-medium">
      Bald verfügbar
    </span>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notif, setNotif]     = useState<NotifSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const [openSection, setOpenSection] = useState<AccordionSection | null>(null)

  const [uiLang, setUiLang] = useState('de')

  const { theme, toggleTheme } = useThemeStore()

  const [accessSaving, setAccessSaving]   = useState(false)
  const [notifSaving, setNotifSaving]     = useState<Set<keyof NotifSettings>>(new Set())
  const [publishSaving, setPublishSaving] = useState(false)
  const [visSaving, setVisSaving]         = useState<Set<string>>(new Set())

  const [gdprLoading, setGdprLoading]     = useState(false)
  const [gdprError, setGdprError]         = useState<string | null>(null)
  const [gdprCooldown, setGdprCooldown]   = useState<string | null>(null)

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer        = useRef<ReturnType<typeof setTimeout> | null>(null)

  const router = useRouter()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteError, setDeleteError]           = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading]       = useState(false)
  const deleteDialogRef = useRef<HTMLDivElement>(null)

  const [subDetail, setSubDetail]         = useState<SubDetail | null>(null)
  const [subLoading, setSubLoading]       = useState(false)
  const [subFetched, setSubFetched]       = useState(false)
  const [cancelConfirm, setCancelConfirm] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [checkoutPlan, setCheckoutPlan]   = useState<'monthly' | 'yearly' | 'lifetime' | null>(null)
  const [reportOpen, setReportOpen]       = useState(false)

  const [blockedUsers, setBlockedUsers]   = useState<BlockedUser[]>([])
  const [blocksLoading, setBlocksLoading] = useState(false)
  const [blocksFetched, setBlocksFetched] = useState(false)
  const [confirmingUnblockId, setConfirmingUnblockId] = useState<string | null>(null)
  const [unblocking, setUnblocking]       = useState(false)

  useEffect(() => {
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current) }
  }, [])

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [prof, ns] = await Promise.all([
          fetchApi<Profile>('/profile/me'),
          fetchApi<NotifSettings>('/notifications/settings'),
        ])
        setProfile(prof)
        setNotif(ns)
      } catch (err) {
        if (err instanceof Error && err.message === 'Session expired') return
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Lazy-load subscription detail ─────────────────────────────────────────

  useEffect(() => {
    if (openSection !== 'payment' || subFetched) return
    setSubFetched(true)
    setSubLoading(true)
    fetchApi<SubDetail>('/payment/subscriptions')
      .then(setSubDetail)
      .catch(() => {})
      .finally(() => setSubLoading(false))
  }, [openSection, subFetched])

  useEffect(() => {
    if (openSection !== 'security' || blocksFetched) return
    setBlocksFetched(true)
    setBlocksLoading(true)
    fetchApi<BlockedUser[]>('/profile/me/blocks')
      .then(setBlockedUsers)
      .catch(() => {})
      .finally(() => setBlocksLoading(false))
  }, [openSection, blocksFetched])

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  // ── Delete account dialog ─────────────────────────────────────────────────

  function closeDeleteDialog() {
    setDeleteDialogOpen(false)
    setDeleteError(null)
  }

  async function handleDeleteAccount() {
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await fetchApi('/auth/account', { method: 'DELETE' })
      useAuthStore.getState().logout()
      router.replace('/login')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Fehler beim Löschen des Kontos')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ── Cancel subscription ────────────────────────────────────────────────────

  async function handleCancelSubscription() {
    if (!subDetail) return
    setCancelLoading(true)
    try {
      await fetchApi(`/payment/subscriptions/${subDetail.id}`, { method: 'DELETE' })
      const updated = await fetchApi<Profile>('/profile/me')
      setProfile(updated)
      setSubDetail(null)
      setSubFetched(false)
      setCancelConfirm(false)
      showToast('Abonnement gekündigt')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler beim Kündigen', false)
    } finally {
      setCancelLoading(false)
    }
  }

  useEffect(() => {
    if (!deleteDialogOpen) return
    const dialog = deleteDialogRef.current
    if (!dialog) return
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>('button, [href], input, [tabindex]:not([tabindex="-1"])')
    )
    focusable[0]?.focus()
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { closeDeleteDialog(); return }
      if (e.key !== 'Tab') return
      const first = focusable[0]
      const last  = focusable[focusable.length - 1]
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus() }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first?.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [deleteDialogOpen])

  // ── Accordion toggle ───────────────────────────────────────────────────────

  function toggleSection(section: AccordionSection) {
    setOpenSection(prev => prev === section ? null : section)
  }

  // ── Accessibility auto-save ────────────────────────────────────────────────

  async function saveAccessibility(
    patch: Partial<Pick<Profile, 'font_size' | 'high_contrast' | 'lang_simple' | 'profanity_filter'>>
  ) {
    if (!profile || accessSaving) return
    const prev = profile
    setProfile({ ...profile, ...patch })
    setAccessSaving(true)
    try {
      const updated = await fetchApi<Profile>('/profile/me', {
        method: 'PUT',
        body: JSON.stringify(patch),
      })
      setProfile(updated)
      useAccessibilityStore.getState().applySettings(updated)
      showToast('Gespeichert')
    } catch {
      setProfile(prev)
      showToast('Fehler beim Speichern', false)
    } finally {
      setAccessSaving(false)
    }
  }

  // ── Notification toggle ────────────────────────────────────────────────────

  async function toggleNotif(key: keyof NotifSettings, value: boolean) {
    if (!notif || notifSaving.has(key)) return
    const prev = notif
    setNotif((current) => current ? { ...current, [key]: value } : current)
    setNotifSaving((s) => { const n = new Set(s); n.add(key); return n })
    try {
      const updated = await fetchApi<NotifSettings>('/notifications/settings', {
        method: 'PUT',
        body: JSON.stringify({ [key]: value }),
      })
      setNotif((current) => current ? { ...current, ...updated } : updated)
      showToast('Gespeichert')
    } catch {
      setNotif(prev)
      showToast('Fehler beim Speichern', false)
    } finally {
      setNotifSaving((s) => { const n = new Set(s); n.delete(key); return n })
    }
  }

  // ── Publish ────────────────────────────────────────────────────────────────

  async function togglePublished(value: boolean) {
    if (!profile || publishSaving) return
    const prev = profile
    setProfile({ ...profile, is_published: value })
    setPublishSaving(true)
    try {
      await fetchApi('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({ is_published: value }),
      })
      showToast(value ? 'Profil veröffentlicht' : 'Profil zurückgezogen')
    } catch {
      setProfile(prev)
      showToast('Fehler beim Speichern', false)
    } finally {
      setPublishSaving(false)
    }
  }

  // ── Visibility field auto-save ─────────────────────────────────────────────

  async function saveVisibility(field: string, value: boolean) {
    if (!profile || visSaving.has(field)) return
    const prev = profile
    setProfile({ ...profile, [field]: value } as Profile)
    setVisSaving((s) => { const n = new Set(s); n.add(field); return n })
    try {
      const updated = await fetchApi<Profile>('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({ [field]: value }),
      })
      setProfile(updated)
      showToast('Gespeichert')
    } catch {
      setProfile(prev)
      showToast('Fehler beim Speichern', false)
    } finally {
      setVisSaving((s) => { const n = new Set(s); n.delete(field); return n })
    }
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  async function handleLogout() {
    try {
      await fetchApi('/auth/logout', { method: 'POST' })
    } catch {
      // backend unreachable — still clear local state
    }
    useAuthStore.getState().logout()
  }

  // ── GDPR export ───────────────────────────────────────────────────────────

  const handleGdprExport = async () => {
    setGdprLoading(true)
    setGdprError(null)
    setGdprCooldown(null)
    try {
      const token = useAuthStore.getState().accessToken
      const res = await fetch(`${API_BASE}/gdpr/export`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        if (res.status === 403 || res.status === 429) {
          setGdprCooldown(body.message ?? 'Export noch nicht verfügbar.')
        } else {
          setGdprError('Export fehlgeschlagen. Bitte versuche es später erneut.')
        }
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'paarship-daten-export.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setGdprError('Export fehlgeschlagen. Bitte versuche es später erneut.')
    } finally {
      setGdprLoading(false)
    }
  }

  // ── Unblock user ──────────────────────────────────────────────────────────

  async function handleUnblock(userId: string) {
    if (unblocking) return
    setUnblocking(true)
    try {
      await fetchApi(`/profile/me/block/${userId}`, { method: 'DELETE' })
      setBlockedUsers((prev) => prev.filter((b) => b.user_id !== userId))
      setConfirmingUnblockId(null)
      showToast('Blockierung aufgehoben')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Fehler beim Entsperren', false)
    } finally {
      setUnblocking(false)
    }
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-on-surface-variant animate-spin" aria-label="Lädt Einstellungen" />
      </main>
    )
  }

  if (error || !profile || !notif) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
        <AlertCircle className="h-10 w-10 text-error" aria-hidden="true" />
        <p className="text-on-surface font-semibold">Einstellungen konnten nicht geladen werden</p>
        <p className="text-on-surface-variant text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm min-h-[44px] hover:opacity-90 transition-opacity"
        >
          Erneut versuchen
        </button>
      </main>
    )
  }

  const fontSizeClass: Record<FontSize, string> = {
    normal: 'text-sm',
    large:  'text-base',
    xl:     'text-lg',
  }

  const visFieldsDisabled = !profile.is_published

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-8">

      {/* Toast */}
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-3">
        <h1 className="text-2xl font-bold text-on-surface mb-5">Einstellungen</h1>

        {/* ── A) Design & Barrierefreiheit ──────────────────────────────────── */}
        <AccordionItem
          title="Design & Barrierefreiheit"
          icon={<Type className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />}
          isOpen={openSection === 'design'}
          onToggle={() => toggleSection('design')}
        >
          <ToggleRow
            id="theme-mode"
            label="Heller Modus"
            description="Wechsle zwischen dunklem und hellem Design"
            checked={theme === 'light'}
            onChange={() => toggleTheme()}
          />

          <ToggleRow
            id="profanity-filter"
            label="Schimpfwortfilter"
            description="Unangemessene Wörter werden unkenntlich gemacht"
            checked={profile.profanity_filter}
            onChange={(v) => saveAccessibility({ profanity_filter: v })}
            saving={accessSaving}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-on-surface" id="font-size-label">
              Schriftgröße
            </p>
            <div
              role="group"
              aria-labelledby="font-size-label"
              className="flex rounded-xl overflow-hidden border border-outline-variant"
            >
              {([
                { value: 'normal', label: 'Normal' },
                { value: 'large',  label: 'Groß' },
                { value: 'xl',     label: 'Sehr groß' },
              ] as const).map(({ value, label }, i, arr) => (
                <button
                  key={value}
                  onClick={() => profile.font_size !== value && saveAccessibility({ font_size: value })}
                  disabled={accessSaving}
                  aria-pressed={profile.font_size === value}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors min-h-[44px] disabled:opacity-50 border-outline-variant ${
                    i < arr.length - 1 ? 'border-r' : ''
                  } ${
                    profile.font_size === value
                      ? 'bg-primary-fixed-dim text-on-primary-container'
                      : 'bg-transparent text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <ToggleRow
            id="high-contrast"
            label="Hoher Kontrast"
            description="Erhöht den Farbkontrast für bessere Lesbarkeit"
            checked={profile.high_contrast}
            onChange={(v) => saveAccessibility({ high_contrast: v })}
            saving={accessSaving}
          />

          <ToggleRow
            id="lang-simple"
            label="Einfache Sprache"
            description="Inhalte werden in leicht verständlicher Sprache angezeigt"
            checked={profile.lang_simple}
            onChange={(v) => saveAccessibility({ lang_simple: v })}
            saving={accessSaving}
          />

          <div className="space-y-1.5">
            <label htmlFor="ui-lang" className="text-sm font-medium text-on-surface">
              <Globe className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" aria-hidden="true" />
              Sprache der Benutzeroberfläche
            </label>
            <div className="relative">
              <select
                id="ui-lang"
                value={uiLang}
                onChange={(e) => setUiLang(e.target.value)}
                className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim transition-colors cursor-pointer min-h-[44px]"
              >
                <option value="de">Deutsch</option>
                <option value="en">English</option>
              </select>
              <ChevronDown
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none"
                aria-hidden="true"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <SectionLabel>Vorschau</SectionLabel>
            <div
              className={`rounded-xl border border-outline-variant p-4 transition-all ${
                profile.high_contrast ? 'bg-background' : 'bg-surface-container-high'
              }`}
              aria-label="Vorschau der aktuellen Einstellungen"
            >
              <p
                className={`leading-relaxed transition-all ${fontSizeClass[profile.font_size]} ${
                  profile.high_contrast ? 'text-on-surface font-medium' : 'text-on-surface-variant'
                }`}
              >
                Das ist ein Beispieltext. So sieht dein Text mit den aktuellen Einstellungen aus.
              </p>
            </div>
          </div>
        </AccordionItem>

        {/* ── B) Benachrichtigungen ─────────────────────────────────────────── */}
        <AccordionItem
          title="Benachrichtigungen"
          icon={<Bell className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />}
          isOpen={openSection === 'notifications'}
          onToggle={() => toggleSection('notifications')}
        >
          <div className="space-y-3">
            <SectionLabel>E-Mail</SectionLabel>
            {([
              { key: 'email_messages', label: 'Neue Nachrichten', desc: 'Bei neuen Chat-Nachrichten' },
              { key: 'email_matches',  label: 'Neue Matches',     desc: 'Bei neuen Verbindungen' },
              { key: 'email_system',   label: 'Systemmeldungen',  desc: 'Bei wichtigen Updates' },
            ] as const).map(({ key, label, desc }) => (
              <ToggleRow
                key={key}
                id={key}
                label={label}
                description={desc}
                checked={notif[key]}
                onChange={(v) => toggleNotif(key, v)}
                saving={notifSaving.has(key)}
              />
            ))}
          </div>

          <Divider />

          <div className="space-y-3">
            <SectionLabel>Push</SectionLabel>
            {([
              { key: 'push_messages', label: 'Neue Nachrichten', desc: 'Bei neuen Chat-Nachrichten' },
              { key: 'push_matches',  label: 'Neue Matches',     desc: 'Bei neuen Verbindungen' },
              { key: 'push_system',   label: 'Systemmeldungen',  desc: 'Bei wichtigen Updates' },
            ] as const).map(({ key, label, desc }) => (
              <ToggleRow
                key={key}
                id={key}
                label={label}
                description={desc}
                checked={notif[key]}
                onChange={(v) => toggleNotif(key, v)}
                saving={notifSaving.has(key)}
              />
            ))}
          </div>
        </AccordionItem>

        {/* ── C) Sichtbarkeit ───────────────────────────────────────────────── */}
        <AccordionItem
          title="Sichtbarkeit"
          icon={<Eye className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />}
          isOpen={openSection === 'visibility'}
          onToggle={() => toggleSection('visibility')}
        >
          {/* Master toggle */}
          <ToggleRow
            id="is-published"
            label="Profil öffentlich"
            description={profile.is_published
              ? 'Andere Nutzer können dich finden'
              : 'Nur du siehst dein Profil'}
            checked={profile.is_published}
            onChange={togglePublished}
            saving={publishSaving}
            disabled={!profile.is_published && !profile.onboarding_completed}
          />

          <p className="text-xs text-on-surface-variant">
            Nickname und Profilbild sind immer sichtbar
          </p>

          {!profile.is_published && !profile.onboarding_completed && (
            <p className="text-xs text-on-surface-variant">
              Schließe dein Onboarding ab, um dein Profil zu veröffentlichen.
            </p>
          )}

          <Divider />

          {/* Field visibility toggles */}
          <div className={`space-y-3 transition-opacity duration-200 ${visFieldsDisabled ? 'opacity-50' : ''}`}>
            {([
              { field: 'status_visible',  label: 'Online-Status' },
              { field: 'show_bio',        label: 'Bio' },
              { field: 'show_city',       label: 'Stadt' },
              { field: 'show_age',        label: 'Alter' },
              { field: 'show_gender',     label: 'Geschlecht & Suche' },
              { field: 'show_interests',  label: 'Interessen' },
              { field: 'show_audio',      label: 'Vorstellung / Audio' },
            ] as const).map(({ field, label }) => (
              <ToggleRow
                key={field}
                id={field}
                label={label}
                checked={profile[field] as boolean}
                onChange={(v) => saveVisibility(field, v)}
                saving={visSaving.has(field)}
                disabled={visFieldsDisabled}
              />
            ))}
          </div>
        </AccordionItem>

        {/* ── D) Konto ──────────────────────────────────────────────────────── */}
        <AccordionItem
          title="Konto"
          icon={<Lock className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />}
          isOpen={openSection === 'account'}
          onToggle={() => toggleSection('account')}
        >
          {/* Logout – top of Konto */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors min-h-[52px]"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Abmelden
          </button>

          <Divider />

          {/* Subscription */}
          <div>
            <SectionLabel>Abonnement</SectionLabel>
            <div className="mt-3">
              {profile.subscription ? (
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-high min-h-[52px]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-on-surface capitalize">
                        {profile.subscription.plan}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-fixed-dim/20 text-primary-fixed-dim font-medium capitalize">
                        {profile.subscription.status}
                      </span>
                    </div>
                    {profile.subscription.current_period_end && (
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Läuft bis {new Date(profile.subscription.current_period_end).toLocaleDateString('de-DE')}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-on-surface-variant px-1">Kein aktives Abonnement</p>
              )}
            </div>
          </div>

          <Divider />

          {/* Account actions */}
          <div className="space-y-2">
            {(['Passwort ändern', 'E-Mail ändern'] as const).map((label) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-high min-h-[52px]"
              >
                <span className="text-sm font-medium text-on-surface-variant">{label}</span>
                <ComingSoonBadge />
              </div>
            ))}

            <button
              onClick={() => setDeleteDialogOpen(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-high min-h-[52px] hover:bg-error-container/40 transition-colors text-left"
            >
              <span className="text-sm font-medium text-error">Konto löschen</span>
            </button>

            <div>
              <button
                onClick={handleGdprExport}
                disabled={gdprLoading}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-high min-h-[52px] hover:bg-surface-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="text-sm font-medium text-on-surface">Daten exportieren (PDF)</span>
                {gdprLoading
                  ? <Loader2 className="h-4 w-4 text-on-surface-variant animate-spin flex-shrink-0" aria-hidden="true" />
                  : <Download className="h-4 w-4 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
                }
              </button>
              <p className="text-xs text-on-surface-variant mt-1 px-1">
                Gemäß Art. 15 DSGVO · max. 1× pro 30 Tage
              </p>
              {gdprCooldown && (
                <p className="text-xs text-amber-500 mt-1 px-1">{gdprCooldown}</p>
              )}
              {gdprError && (
                <p className="text-xs text-red-500 mt-1 px-1">{gdprError}</p>
              )}
            </div>
          </div>

        </AccordionItem>

        {/* ── E) Sicherheit & Blockierungen ────────────────────────────────── */}
        <AccordionItem
          title="Sicherheit & Blockierungen"
          icon={<Shield className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />}
          isOpen={openSection === 'security'}
          onToggle={() => toggleSection('security')}
        >
          {blocksLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 text-on-surface-variant animate-spin" aria-label="Lädt blockierte Nutzer" />
            </div>
          ) : blockedUsers.length === 0 ? (
            <p className="text-sm text-on-surface-variant text-center py-2">Keine blockierten Nutzer</p>
          ) : (
            <div className="space-y-2">
              {blockedUsers.map((b) => (
                <div key={b.user_id} className="rounded-xl bg-surface-container-high overflow-hidden">
                  <div className="flex items-center gap-3 px-4 py-3 min-h-[56px]">
                    {/* Avatar */}
                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-surface-container overflow-hidden flex items-center justify-center">
                      {b.photo_url ? (
                        <img src={b.photo_url} alt="" className="h-full w-full object-cover" aria-hidden="true" />
                      ) : (
                        <User className="h-4 w-4 text-outline" aria-hidden="true" />
                      )}
                    </div>

                    <span className="flex-1 text-sm font-medium text-on-surface truncate">{b.nickname}</span>

                    {confirmingUnblockId === b.user_id ? (
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() => setConfirmingUnblockId(null)}
                          disabled={unblocking}
                          className="px-3 py-1.5 rounded-full border border-outline-variant text-on-surface text-xs font-medium hover:bg-surface-container transition-colors disabled:opacity-50 min-h-[36px]"
                        >
                          Abbrechen
                        </button>
                        <button
                          onClick={() => handleUnblock(b.user_id)}
                          disabled={unblocking}
                          className="px-3 py-1.5 rounded-full bg-error-container text-error text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 min-h-[36px] flex items-center gap-1.5"
                        >
                          {unblocking && <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />}
                          Bestätigen
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmingUnblockId(b.user_id)}
                        className="flex-shrink-0 px-3 py-1.5 rounded-full border border-outline-variant text-on-surface text-xs font-medium hover:bg-surface-container transition-colors min-h-[36px]"
                      >
                        Entsperren
                      </button>
                    )}
                  </div>

                  {confirmingUnblockId === b.user_id && (
                    <div className="px-4 pb-3 text-xs text-on-surface-variant">
                      Möchtest du die Blockierung aufheben?
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AccordionItem>

        {/* ── F) Abonnement & Zahlung ───────────────────────────────────────── */}
        <AccordionItem
          title="Abonnement & Zahlung"
          icon={<CreditCard className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />}
          isOpen={openSection === 'payment'}
          onToggle={() => toggleSection('payment')}
        >
          {subLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-5 w-5 text-on-surface-variant animate-spin" aria-label="Lädt Abonnement" />
            </div>
          ) : profile.subscription?.status === 'active' ? (
            <div className="space-y-4">
              <div className="px-4 py-3 rounded-xl bg-surface-container-high">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-on-surface">
                    {({ monthly: 'Monatlich', yearly: 'Jährlich', lifetime: 'Lebenslang' } as Record<string, string>)[profile.subscription.plan] ?? profile.subscription.plan}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary-fixed-dim/20 text-primary-fixed-dim font-medium">
                    Aktiv
                  </span>
                </div>
                {profile.subscription.plan !== 'lifetime' && profile.subscription.current_period_end && (
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Läuft bis {new Date(profile.subscription.current_period_end).toLocaleDateString('de-DE')}
                  </p>
                )}
              </div>

              {!cancelConfirm ? (
                <button
                  onClick={() => setCancelConfirm(true)}
                  className="w-full py-3 rounded-full bg-error/10 text-error text-sm font-semibold hover:bg-error/20 transition-colors min-h-[44px]"
                >
                  Abonnement kündigen
                </button>
              ) : (
                <div className="rounded-xl border border-error/30 bg-error-container/20 p-4 space-y-3">
                  <p className="text-sm text-on-surface">
                    Bist du sicher? Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCancelConfirm(false)}
                      disabled={cancelLoading}
                      className="flex-1 py-2.5 rounded-full border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors min-h-[44px] disabled:opacity-50"
                    >
                      Abbrechen
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      disabled={cancelLoading || !subDetail}
                      className="flex-1 py-2.5 rounded-full bg-error text-on-error text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                    >
                      {cancelLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                      Bestätigen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-on-surface-variant px-1">Kein aktives Abonnement</p>
              <div className="space-y-2">
                {([
                  { plan: 'monthly',  label: 'Monatlich' },
                  { plan: 'yearly',   label: 'Jährlich' },
                  { plan: 'lifetime', label: 'Lebenslang' },
                ] as const).map(({ plan, label }) => (
                  <button
                    key={plan}
                    onClick={() => setCheckoutPlan(plan)}
                    className="w-full py-3 rounded-full bg-primary-fixed-dim text-on-primary-container text-sm font-semibold hover:opacity-90 transition-opacity min-h-[44px]"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </AccordionItem>

        {/* ── G) Support ───────────────────────────────────────────────────── */}
        <AccordionItem
          title="Support"
          icon={<Flag className="h-4 w-4 text-on-surface-variant" aria-hidden="true" />}
          isOpen={openSection === 'support'}
          onToggle={() => toggleSection('support')}
        >
          <p className="text-sm text-on-surface-variant">
            Hast du ein Problem mit einem Nutzer oder unangemessene Inhalte gesehen?
          </p>
          <button
            onClick={() => setReportOpen(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-container-high min-h-[52px] hover:bg-surface-container transition-colors text-left"
          >
            <Flag className="h-4 w-4 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-on-surface">Problem melden</span>
          </button>
        </AccordionItem>

      </div>

      {/* ── Stripe Embedded Checkout modal ─────────────────────────────────── */}
      {checkoutPlan && (
        <StripeCheckoutModal
          plan={checkoutPlan}
          onClose={() => setCheckoutPlan(null)}
        />
      )}

      {/* ── Report modal ───────────────────────────────────────────────────── */}
      {reportOpen && (
        <ReportModal onClose={() => setReportOpen(false)} />
      )}

      {/* ── Delete account dialog ───────────────────────────────────────────── */}
      {deleteDialogOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            aria-hidden="true"
            onClick={closeDeleteDialog}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
              ref={deleteDialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-dialog-title"
              className="relative bg-surface-container rounded-2xl p-6 max-w-sm w-full shadow-xl pointer-events-auto"
            >
              <h2
                id="delete-dialog-title"
                className="text-lg font-bold text-on-surface mb-4"
              >
                Konto löschen?
              </h2>

              <ul className="text-sm text-on-surface-variant space-y-2 mb-5 list-disc list-inside leading-relaxed">
                <li>Dein Profil wird sofort unsichtbar für andere User</li>
                <li>
                  Du hast 30 Tage Zeit — wenn du dich in dieser Zeit einloggst,
                  wird dein Konto automatisch reaktiviert
                </li>
                <li>
                  Nach 30 Tagen werden deine Daten unwiderruflich
                  pseudonymisiert (DSGVO Art. 17)
                </li>
              </ul>

              {deleteError && (
                <p role="alert" className="text-sm text-error mb-4 flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {deleteError}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={closeDeleteDialog}
                  className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-colors min-h-[44px]"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 py-3 rounded-full bg-error text-on-error text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-h-[44px]"
                >
                  {deleteLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  )}
                  Konto endgültig löschen
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
