'use client'

import { useEffect, useState, type ElementType, type ReactNode } from 'react'
import Link from 'next/link'
import {
  User, MapPin, Calendar, FileText, Tag, Eye,
  CheckCircle, XCircle, Pencil, X, Save, Plus,
  AlertCircle, Loader2, BarChart2, Heart, MessageCircle,
  ChevronDown, Settings,
} from 'lucide-react'
import { fetchApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  user_id: string
  nickname: string
  birthdate: string | null
  city: string | null
  bio: string | null
  photo_id: string | null
  onboarding_completed: boolean
  is_published: boolean
  lang_simple: boolean
  font_size: string
  high_contrast: boolean
  search_radius_km: number
}

interface Interest {
  id: string
  name: string
}

interface UserInterest {
  id: string
  user_id: string
  interest_id: string
  interest: Interest
}

type UIEnvelope = UserInterest[] | { data: UserInterest[] }
type IEnvelope  = Interest[]     | { data: Interest[] }

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalise<T>(res: T[] | { data: T[] }): T[] {
  return Array.isArray(res) ? res : ((res as { data: T[] })?.data ?? [])
}

function calcAge(birthdate: string): number {
  return Math.floor(
    (Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  )
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
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
        <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">{title}</h2>
      </div>
      {children}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile]             = useState<Profile | null>(null)
  const [userInterests, setUserInterests] = useState<UserInterest[]>([])
  const [allInterests, setAllInterests]   = useState<Interest[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  const [editMode, setEditMode]   = useState(false)
  const [draft, setDraft]         = useState({ nickname: '', bio: '', city: '' })
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [publishLoading, setPublishLoading] = useState(false)
  const [publishError, setPublishError]     = useState<string | null>(null)

  const [selectedInterestId, setSelectedInterestId] = useState('')
  const [interestLoading, setInterestLoading]       = useState<string | null>(null)

  // ── Load ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [prof, ui, ai] = await Promise.all([
          fetchApi<Profile>('/profile/me'),
          fetchApi<UIEnvelope>('/profile/me/interests'),
          fetchApi<IEnvelope>('/profile/interests'),
        ])
        setProfile(prof)
        setUserInterests(normalise(ui))
        setAllInterests(normalise(ai))
      } catch (err) {
        if (err instanceof Error && err.message === 'Session expired') return
        setError(err instanceof Error ? err.message : 'Fehler beim Laden')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Edit ───────────────────────────────────────────────────────────────────

  function startEdit() {
    if (!profile) return
    setDraft({ nickname: profile.nickname ?? '', bio: profile.bio ?? '', city: profile.city ?? '' })
    setSaveError(null)
    setEditMode(true)
  }

  function cancelEdit() {
    setEditMode(false)
    setSaveError(null)
  }

  async function handleSave() {
    if (!profile || !draft.nickname.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      await fetchApi<Profile>('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({ nickname: draft.nickname, bio: draft.bio, city: draft.city }),
      })
      // Re-fetch to pick up server-side onboarding_completed update
      const refreshed = await fetchApi<Profile>('/profile/me')
      setProfile(refreshed)
      setEditMode(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  // ── Interests ──────────────────────────────────────────────────────────────

  async function handleAddInterest() {
    if (!selectedInterestId) return
    setInterestLoading(selectedInterestId)
    try {
      const updated = await fetchApi<UIEnvelope>(`/profile/me/interests/${selectedInterestId}`, { method: 'POST' })
      setUserInterests(normalise(updated))
      setSelectedInterestId('')
      // Refresh profile so onboarding_completed reflects new interest count
      const refreshed = await fetchApi<Profile>('/profile/me')
      setProfile(refreshed)
    } catch {
      // silent — user can retry
    } finally {
      setInterestLoading(null)
    }
  }

  async function handleRemoveInterest(interestId: string) {
    setInterestLoading(interestId)
    try {
      const updated = await fetchApi<UIEnvelope>(`/profile/me/interests/${interestId}`, { method: 'DELETE' })
      setUserInterests(normalise(updated))
    } catch {
      // silent
    } finally {
      setInterestLoading(null)
    }
  }

  // ── Publish ────────────────────────────────────────────────────────────────

  async function handlePublish() {
    setPublishLoading(true)
    setPublishError(null)
    try {
      const updated = await fetchApi<Profile>('/profile/me/publish', { method: 'PATCH' })
      setProfile(updated)
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Fehler beim Veröffentlichen')
    } finally {
      setPublishLoading(false)
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const availableInterests = allInterests.filter(
    (i) => !userInterests.some((ui) => ui.interest_id === i.id)
  )

  const onboardingChecks = [
    { label: 'Nickname',        done: !!profile?.nickname },
    { label: 'Geburtsdatum',    done: !!profile?.birthdate },
    { label: 'Stadt',           done: !!profile?.city },
    { label: 'Mind. 1 Interesse', done: userInterests.length >= 1 },
  ]

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 text-on-surface-variant animate-spin" aria-label="Lädt Profil" />
      </main>
    )
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
        <AlertCircle className="h-10 w-10 text-error" aria-hidden="true" />
        <p className="text-on-surface font-semibold">Profil konnte nicht geladen werden</p>
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">

        {/* Header row */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-on-surface">Mein Profil</h1>

          {!editMode ? (
            <div className="flex items-center gap-2">
              <Link
                href="/settings"
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container transition-colors min-h-[40px]"
              >
                <Settings className="h-3.5 w-3.5" aria-hidden="true" />
                Einstellungen
              </Link>
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container transition-colors min-h-[40px]"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                Bearbeiten
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container transition-colors min-h-[40px] disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !draft.nickname.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-fixed-dim text-on-primary-container text-sm font-semibold hover:opacity-90 active:scale-95 transition-all min-h-[40px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  : <Save className="h-3.5 w-3.5" aria-hidden="true" />}
                Speichern
              </button>
            </div>
          )}
        </div>

        {saveError && (
          <div className="flex items-center gap-2 rounded-xl bg-error-container text-error px-4 py-3 text-sm" role="alert">
            <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
            {saveError}
          </div>
        )}

        {/* Two-column layout on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-5 items-start">

          {/* ── Left: main content ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* ── Profile header ─────────────────────────────────────────── */}
            <SectionCard title="Profil" icon={User}>
              <div className="flex items-start gap-4">
                {/* Avatar placeholder */}
                <div
                  className="flex-shrink-0 h-20 w-20 rounded-full bg-surface-container-high flex items-center justify-center"
                  aria-hidden="true"
                >
                  <User className="h-9 w-9 text-outline" />
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                  {editMode ? (
                    <>
                      <div className="space-y-1">
                        <label htmlFor="nickname" className="text-xs font-medium text-on-surface-variant">
                          Nickname
                        </label>
                        <input
                          id="nickname"
                          type="text"
                          value={draft.nickname}
                          onChange={(e) => setDraft((d) => ({ ...d, nickname: e.target.value }))}
                          maxLength={50}
                          className="w-full rounded-xl bg-surface-container-high border border-outline-variant px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-primary-fixed-dim transition-colors"
                          placeholder="Nickname"
                        />
                      </div>
                      <div className="space-y-1">
                        <label htmlFor="city" className="text-xs font-medium text-on-surface-variant">
                          Stadt
                        </label>
                        <div className="relative">
                          <MapPin
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant pointer-events-none"
                            aria-hidden="true"
                          />
                          <input
                            id="city"
                            type="text"
                            value={draft.city}
                            onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                            maxLength={100}
                            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-container-high border border-outline-variant text-sm text-on-surface focus:outline-none focus:border-primary-fixed-dim transition-colors"
                            placeholder="Stadt"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-xl font-bold text-on-surface leading-tight">{profile.nickname}</p>
                        {profile.birthdate && (
                          <p className="text-sm text-on-surface-variant mt-0.5">
                            {calcAge(profile.birthdate)} Jahre
                          </p>
                        )}
                      </div>
                      {profile.city && (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
                          <p className="text-sm text-on-surface-variant">{profile.city}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* ── About ──────────────────────────────────────────────────── */}
            <SectionCard title="Über mich" icon={FileText}>
              {profile.birthdate && (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <Calendar className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  <span>
                    {formatDate(profile.birthdate)}&ensp;·&ensp;{calcAge(profile.birthdate)} Jahre
                  </span>
                </div>
              )}

              {editMode ? (
                <div className="space-y-1">
                  <label htmlFor="bio" className="text-xs font-medium text-on-surface-variant">
                    Bio
                  </label>
                  <textarea
                    id="bio"
                    value={draft.bio}
                    onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                    rows={4}
                    maxLength={1000}
                    className="w-full rounded-xl bg-surface-container-high border border-outline-variant px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-primary-fixed-dim transition-colors resize-none"
                    placeholder="Erzähl etwas über dich…"
                  />
                  <p className="text-xs text-on-surface-variant text-right" aria-live="polite">
                    {draft.bio.length}/1000
                  </p>
                </div>
              ) : (
                <p className={`text-sm leading-relaxed ${profile.bio ? 'text-on-surface' : 'text-on-surface-variant italic'}`}>
                  {profile.bio ?? 'Noch keine Bio hinzugefügt.'}
                </p>
              )}
            </SectionCard>

            {/* ── Interests ──────────────────────────────────────────────── */}
            <SectionCard title="Interessen" icon={Tag}>
              {/* Current tags */}
              <div className="flex flex-wrap gap-2" aria-label="Deine Interessen">
                {userInterests.length === 0 ? (
                  <p className="text-sm text-on-surface-variant italic">Noch keine Interessen hinzugefügt.</p>
                ) : (
                  userInterests.map((ui) => (
                    <span
                      key={ui.interest_id}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-primary-fixed-dim text-on-primary-container text-sm font-medium"
                    >
                      {ui.interest.name}
                      <button
                        onClick={() => handleRemoveInterest(ui.interest_id)}
                        disabled={interestLoading !== null}
                        className="flex items-center justify-center h-4 w-4 rounded-full hover:bg-on-primary-container/20 transition-colors disabled:opacity-50"
                        aria-label={`${ui.interest.name} entfernen`}
                      >
                        {interestLoading === ui.interest_id ? (
                          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                        ) : (
                          <X className="h-3 w-3" aria-hidden="true" />
                        )}
                      </button>
                    </span>
                  ))
                )}
              </div>

              {/* Add interest */}
              {availableInterests.length > 0 && (
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <select
                      value={selectedInterestId}
                      onChange={(e) => setSelectedInterestId(e.target.value)}
                      disabled={interestLoading !== null}
                      className="w-full appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim transition-colors cursor-pointer min-h-[44px] disabled:opacity-50"
                      aria-label="Interesse auswählen"
                    >
                      <option value="">Interesse auswählen…</option>
                      {availableInterests.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>
                    <ChevronDown
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                  <button
                    onClick={handleAddInterest}
                    disabled={!selectedInterestId || interestLoading !== null}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary-fixed-dim text-on-primary-container text-sm font-semibold hover:opacity-90 active:scale-95 transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Interesse hinzufügen"
                  >
                    {interestLoading === selectedInterestId && selectedInterestId !== '' ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Plus className="h-4 w-4" aria-hidden="true" />
                    )}
                    Hinzufügen
                  </button>
                </div>
              )}
            </SectionCard>

            {/* ── Visibility ─────────────────────────────────────────────── */}
            <SectionCard title="Sichtbarkeit" icon={Eye}>
              {/* Onboarding checklist */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
                  Voraussetzungen
                </p>
                {onboardingChecks.map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    {done ? (
                      <CheckCircle className="h-4 w-4 text-primary-fixed-dim flex-shrink-0" aria-hidden="true" />
                    ) : (
                      <XCircle className="h-4 w-4 text-on-surface-variant flex-shrink-0" aria-hidden="true" />
                    )}
                    <span className={done ? 'text-on-surface' : 'text-on-surface-variant'}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="h-px bg-outline-variant" />

              {/* Published status or publish button */}
              {profile.is_published ? (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary-fixed-dim animate-pulse" aria-hidden="true" />
                  <span className="text-sm font-semibold text-on-surface">
                    Profil ist öffentlich sichtbar
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-on-surface-variant">
                    {profile.onboarding_completed
                      ? 'Dein Profil ist bereit. Veröffentliche es, um von anderen gefunden zu werden.'
                      : 'Fülle alle Voraussetzungen aus, um dein Profil zu veröffentlichen.'}
                  </p>
                  {publishError && (
                    <p className="text-xs text-error" role="alert">{publishError}</p>
                  )}
                  <button
                    onClick={handlePublish}
                    disabled={!profile.onboarding_completed || publishLoading}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-sm font-semibold hover:opacity-90 active:scale-95 transition-all min-h-[44px] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {publishLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Eye className="h-4 w-4" aria-hidden="true" />
                    )}
                    Profil veröffentlichen
                  </button>
                </div>
              )}
            </SectionCard>
          </div>

          {/* ── Right: sidebar ─────────────────────────────────────────────── */}
          <aside className="space-y-5">

            {/* Stats */}
            <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-primary-fixed-dim" aria-hidden="true" />
                <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  Statistiken
                </h2>
              </div>
              {([
                { icon: Eye,           label: 'Profilaufrufe', value: '—' },
                { icon: Heart,         label: 'Matches',       value: '—' },
                { icon: MessageCircle, label: 'Antwortrate',   value: '—' },
              ] as const).map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                    <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {label}
                  </div>
                  <span className="text-sm font-semibold text-on-surface">{value}</span>
                </div>
              ))}
              <p className="text-xs text-on-surface-variant italic">Bald verfügbar</p>
            </div>

            {/* Onboarding status */}
            <div className="rounded-2xl bg-surface-container border border-outline-variant p-4 sm:p-5 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary-fixed-dim" aria-hidden="true" />
                <h2 className="text-xs font-semibold text-on-surface-variant uppercase tracking-wide">
                  Onboarding
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${profile.onboarding_completed ? 'bg-primary-fixed-dim' : 'bg-outline'}`}
                  aria-hidden="true"
                />
                <span className="text-sm text-on-surface">
                  {profile.onboarding_completed ? 'Abgeschlossen' : 'Unvollständig'}
                </span>
              </div>
              {!profile.onboarding_completed && (
                <p className="text-xs text-on-surface-variant">
                  {onboardingChecks.filter((c) => !c.done).map((c) => c.label).join(', ')} fehlt noch.
                </p>
              )}
            </div>

          </aside>
        </div>
      </div>
    </main>
  )
}
