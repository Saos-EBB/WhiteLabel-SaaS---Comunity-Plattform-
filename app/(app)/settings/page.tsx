'use client'

import { useEffect, useRef, useState, type ElementType, type ReactNode } from 'react'
import {
  Type, Globe, Bell, Shield, Trash2, Download,
  Check, AlertCircle, Loader2, ChevronDown, Lock,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAccessibilityStore } from '@/lib/store/accessibilityStore'

// ─── Types ────────────────────────────────────────────────────────────────────

type FontSize = 'normal' | 'large' | 'xl'

interface Profile {
  lang_simple: boolean
  font_size: FontSize
  high_contrast: boolean
  is_published: boolean
  onboarding_completed: boolean
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

// ─── SectionCard ─────────────────────────────────────────────────────────────

function SectionCard({
  title, icon: Icon, children,
}: {
  title: string
  icon: ElementType
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary-fixed-dim flex-shrink-0" aria-hidden="true" />
        <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
          {title}
        </h2>
      </div>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [notif, setNotif]       = useState<NotifSettings | null>(null)
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // UI-only — no backend field for interface language yet
  const [uiLang, setUiLang] = useState('de')

  // Save state
  const [accessSaving, setAccessSaving]   = useState(false)
  const [notifSaving, setNotifSaving]     = useState<Set<keyof NotifSettings>>(new Set())
  const [publishSaving, setPublishSaving] = useState(false)

  // Toast
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer          = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteError, setDeleteError]         = useState<string | null>(null)

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

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  // ── Toast ──────────────────────────────────────────────────────────────────

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  // ── Accessibility auto-save ────────────────────────────────────────────────

  async function saveAccessibility(
    patch: Partial<Pick<Profile, 'font_size' | 'high_contrast' | 'lang_simple'>>
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

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
        <h1 className="text-2xl font-bold text-on-surface">Einstellungen</h1>

        {/* ── 1. Visual Comfort ───────────────────────────────────────────── */}
        <SectionCard title="Visuelle Komfort" icon={Type}>

          {/* Font size segmented control */}
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

          {/* High contrast */}
          <ToggleRow
            id="high-contrast"
            label="Hoher Kontrast"
            description="Erhöht den Farbkontrast für bessere Lesbarkeit"
            checked={profile.high_contrast}
            onChange={(v) => saveAccessibility({ high_contrast: v })}
            saving={accessSaving}
          />

          {/* Live preview */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              Vorschau
            </p>
            <div
              className={`rounded-xl border border-outline-variant p-4 transition-all ${
                profile.high_contrast ? 'bg-background' : 'bg-surface-container-high'
              }`}
              aria-label="Vorschau der aktuellen Einstellungen"
            >
              <p
                className={`leading-relaxed transition-all ${fontSizeClass[profile.font_size]} ${
                  profile.high_contrast
                    ? 'text-on-surface font-medium'
                    : 'text-on-surface-variant'
                }`}
              >
                Das ist ein Beispieltext. So sieht dein Text mit den aktuellen Einstellungen aus.
              </p>
            </div>
          </div>
        </SectionCard>

        {/* ── 2. Language & Communication ─────────────────────────────────── */}
        <SectionCard title="Sprache & Kommunikation" icon={Globe}>

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
        </SectionCard>

        {/* ── 3. Notifications ────────────────────────────────────────────── */}
        <SectionCard title="Benachrichtigungen" icon={Bell}>

          {/* Email */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              E-Mail
            </p>
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

          <div className="h-px bg-outline-variant" />

          {/* Push */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              Push
            </p>
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
        </SectionCard>

        {/* ── 4. Privacy ──────────────────────────────────────────────────── */}
        <SectionCard title="Datenschutz & Sichtbarkeit" icon={Shield}>

          <ToggleRow
            id="is-published"
            label="Profil sichtbar"
            description={profile.is_published
              ? 'Öffentlich — andere Nutzer können dich finden'
              : 'Privat — nur du siehst dein Profil'}
            checked={profile.is_published}
            onChange={togglePublished}
            saving={publishSaving}
            disabled={!profile.is_published && !profile.onboarding_completed}
          />

          {!profile.is_published && !profile.onboarding_completed && (
            <p className="text-xs text-on-surface-variant">
              Schließe dein Onboarding ab, um dein Profil zu veröffentlichen.
            </p>
          )}

          <div className="h-px bg-outline-variant" />

          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${
                profile.onboarding_completed ? 'bg-primary-fixed-dim' : 'bg-outline'
              }`}
              aria-hidden="true"
            />
            <span className="text-sm text-on-surface">
              Onboarding: {profile.onboarding_completed ? 'Abgeschlossen' : 'Unvollständig'}
            </span>
          </div>
        </SectionCard>

        {/* ── 5. Account ──────────────────────────────────────────────────── */}
        <SectionCard title="Konto" icon={Lock}>

          {/* Password change — placeholder */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-high min-h-[52px]">
            <span className="text-sm font-medium text-on-surface">Passwort ändern</span>
            <span className="text-xs text-on-surface-variant">Bald verfügbar</span>
          </div>

          {/* Delete account */}
          <button
            onClick={() => { setShowDeleteModal(true); setDeleteError(null) }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-error/40 text-error text-sm font-medium hover:bg-error-container transition-colors min-h-[52px]"
          >
            <Trash2 className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            Konto löschen
          </button>
        </SectionCard>

        {/* ── 6. DSGVO ────────────────────────────────────────────────────── */}
        <SectionCard title="Datenschutz (DSGVO)" icon={Download}>

          {/* Data export — placeholder */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-high min-h-[52px]">
            <span className="text-sm font-medium text-on-surface">Meine Daten exportieren</span>
            <span className="text-xs text-on-surface-variant">Bald verfügbar</span>
          </div>

          <p className="text-xs text-on-surface-variant leading-relaxed">
            Nach der Löschung deines Kontos werden deine personenbezogenen Daten für 30 Tage aufbewahrt
            und anschließend automatisch gelöscht. Anonymisierte Statistikdaten können länger gespeichert
            bleiben. Du hast jederzeit das Recht auf Auskunft, Berichtigung und Löschung deiner Daten
            gemäß DSGVO Art. 15–17.
          </p>
        </SectionCard>
      </div>

      {/* ── Delete confirmation modal ──────────────────────────────────────── */}
      {showDeleteModal && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/50"
            onClick={() => setShowDeleteModal(false)}
            aria-hidden="true"
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-30 rounded-t-2xl bg-surface-container-high border-t border-outline-variant p-6 space-y-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error-container">
                <Trash2 className="h-5 w-5 text-error" aria-hidden="true" />
              </div>
              <p id="delete-modal-title" className="font-semibold text-on-surface">
                Konto wirklich löschen?
              </p>
              <p className="text-sm text-on-surface-variant">
                Dein Konto wird nach 30 Tagen unwiderruflich gelöscht. Bis dahin kannst du dich noch
                anmelden und die Löschung widerrufen.
              </p>
            </div>

            {deleteError && (
              <div className="flex items-center gap-2 rounded-xl bg-error-container text-error px-4 py-3 text-sm" role="alert">
                <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                {deleteError}
              </div>
            )}

            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <button
                onClick={() => setDeleteError('Diese Funktion ist derzeit noch nicht verfügbar.')}
                className="flex-1 py-3 rounded-full bg-error-container text-error font-semibold text-sm min-h-[44px] hover:opacity-90 active:scale-95 transition-all"
              >
                Ja, Konto löschen
              </button>
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteError(null) }}
                className="flex-1 py-3 rounded-full border border-outline-variant text-on-surface font-semibold text-sm min-h-[44px] hover:bg-surface-container active:scale-95 transition-all"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </>
      )}
    </main>
  )
}
