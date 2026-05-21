'use client'

import { useEffect, useRef, useState } from 'react'
import { MapPin, Loader2, AlertCircle, Camera, ChevronDown, Mic, Square, Upload, Clock, CheckCircle2, XCircle, Trash2 } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { OnlineIndicator } from '@/components/ui/OnlineIndicator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string
  user_id: string
  nickname: string
  birthdate: string | null
  city: string | null
  bio: string | null
  photo_id: string | null
  photo_url: string | null
  photo_needs_review: boolean
  audio_id: string | null
  audio_url: string | null
  audio_moderation_status: string | null
  gender: string | null
  looking_for: string | null
  onboarding_completed: boolean
  is_published: boolean
  status_visible: boolean
  status_message: string | null
}

type AudioStatus = 'none' | 'recording' | 'preview' | 'uploading' | 'pending' | 'approved' | 'rejected'

function formatTimer(s: number): string {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

interface Interest {
  id: string
  name_de: string
  name_en: string | null
  category: string | null
}

interface UserInterest {
  id: string
  user_id: string
  interest_id: string
  interest: Interest
}

type UIEnvelope = UserInterest[] | { data: UserInterest[] }
type IEnvelope  = Interest[]     | { data: Interest[] }

function normalise<T>(res: T[] | { data: T[] }): T[] {
  return Array.isArray(res) ? res : ((res as { data: T[] })?.data ?? [])
}

function calcAge(birthdate: string): number {
  return Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [profile, setProfile]             = useState<Profile | null>(null)
  const [userInterests, setUserInterests] = useState<UserInterest[]>([])
  const [allInterests, setAllInterests]   = useState<Interest[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)

  const [editMode, setEditMode]   = useState(false)
  const [draft, setDraft]         = useState({
    nickname: '', bio: '', city: '', gender: '', looking_for: '', is_published: false,
  })
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [interestLoading, setInterestLoading] = useState<string | null>(null)

  const originalNickname = useRef<string>('')
  const originalGender   = useRef<string>('')

  const fileInputRef                                  = useRef<HTMLInputElement>(null)
  const [photoUploading, setPhotoUploading]           = useState(false)
  const [photoPickError, setPhotoPickError]           = useState<string | null>(null)
  const [photoUrl, setPhotoUrl]                       = useState<string | null>(null)
  const [pendingPhotoFile, setPendingPhotoFile]       = useState<File | null>(null)
  const [pendingPhotoPreview, setPendingPhotoPreview] = useState<string | null>(null)

  const [audioStatus, setAudioStatus] = useState<AudioStatus>('none')
  const [audioUrl, setAudioUrl]       = useState<string | null>(null)
  const [audioBlob, setAudioBlob]     = useState<Blob | null>(null)
  const [audioTimer, setAudioTimer]   = useState(0)
  const [audioError, setAudioError]   = useState<string | null>(null)
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null)
  const audioChunksRef     = useRef<Blob[]>([])
  const timerIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const streamRef          = useRef<MediaStream | null>(null)
  const audioFileRef       = useRef<HTMLInputElement>(null)

  // ── Load ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const [prof, ui, ai] = await Promise.all([
          fetchApi<Profile>('/profile/me'),
          fetchApi<UIEnvelope>('/profile/me/interests'),
          fetchApi<IEnvelope>('/profile/interests'),
        ])
        setProfile(prof)
        if (prof.photo_url) {
          try { setPhotoUrl(new URL(prof.photo_url).pathname) } catch { setPhotoUrl(prof.photo_url) }
        }
        if (prof.audio_url) {
          if (prof.audio_moderation_status === 'approved') {
            setAudioStatus('approved')
            try { setAudioUrl(new URL(prof.audio_url).pathname) } catch { setAudioUrl(prof.audio_url) }
          } else if (prof.audio_moderation_status === 'pending') {
            setAudioStatus('pending')
          } else if (prof.audio_moderation_status === 'rejected') {
            setAudioStatus('rejected')
          }
        }
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

  // ── Edit ──────────────────────────────────────────────────────────────────

  function startEdit() {
    if (!profile) return
    originalNickname.current = profile.nickname    ?? ''
    originalGender.current   = profile.gender      ?? ''
    setDraft({
      nickname:     profile.nickname    ?? '',
      bio:          profile.bio         ?? '',
      city:         profile.city        ?? '',
      gender:       profile.gender      ?? '',
      looking_for:  profile.looking_for ?? '',
      is_published: profile.is_published,
    })
    setSaveError(null)
    setPhotoPickError(null)
    setEditMode(true)
  }

  function cancelEdit() {
    if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview)
    setPendingPhotoFile(null)
    setPendingPhotoPreview(null)
    setPhotoPickError(null)
    setSaveError(null)
    setEditMode(false)
  }

  async function handleSave() {
    if (!profile || !draft.nickname.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      if (pendingPhotoFile) {
        setPhotoUploading(true)
        try {
          const formData = new FormData()
          formData.append('file', pendingPhotoFile)
          const { accessToken: freshToken } = await fetchApi<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
          useAuthStore.getState().setAccessToken(freshToken)
          const uploadUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'}/media/upload/profile-photo`
          const res = await fetch(uploadUrl, {
            method: 'POST',
            credentials: 'include',
            headers: { Authorization: `Bearer ${freshToken}` },
            body: formData,
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({})) as { message?: string }
            throw new Error(body.message ?? 'Foto-Upload fehlgeschlagen')
          }
          const data = await res.json() as { file_url: string; id: string }
          URL.revokeObjectURL(pendingPhotoPreview!)
          setPendingPhotoFile(null)
          setPendingPhotoPreview(null)
          setPhotoUrl(new URL(data.file_url).pathname)
          setProfile((prev) => prev ? { ...prev, photo_id: data.id } : prev)
        } finally {
          setPhotoUploading(false)
        }
      }

      const payload: Record<string, unknown> = {
        nickname:     draft.nickname,
        bio:          draft.bio,
        city:         draft.city,
        is_published: draft.is_published,
      }
      if (draft.gender)      payload.gender      = draft.gender
      if (draft.looking_for) payload.looking_for = draft.looking_for

      await fetchApi<Profile>('/profile/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
      })
      const refreshed = await fetchApi<Profile>('/profile/me')
      setProfile(refreshed)
      if (refreshed.photo_url) {
        try { setPhotoUrl(new URL(refreshed.photo_url).pathname) } catch { setPhotoUrl(refreshed.photo_url) }
      }
      setEditMode(false)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern'
      setSaveError(
        msg.toLowerCase().includes('einmal pro jahr')
          ? 'Änderung nicht möglich — du hast dieses Feld bereits dieses Jahr geändert.'
          : msg
      )
    } finally {
      setSaving(false)
    }
  }

  // ── Interests ────────────────────────────────────────────────────────────

  async function handleToggleInterest(interestId: string) {
    if (interestLoading) return
    setInterestLoading(interestId)
    const isSelected = userInterests.some((ui) => ui.interest_id === interestId)
    try {
      if (isSelected) {
        const updated = await fetchApi<UIEnvelope>(`/profile/me/interests/${interestId}`, { method: 'DELETE' })
        setUserInterests(normalise(updated))
      } else {
        const updated = await fetchApi<UIEnvelope>(`/profile/me/interests/${interestId}`, { method: 'POST' })
        setUserInterests(normalise(updated))
        const refreshed = await fetchApi<Profile>('/profile/me')
        setProfile(refreshed)
      }
    } catch {
      // silent — user can retry
    } finally {
      setInterestLoading(null)
    }
  }

  // ── Photo select ─────────────────────────────────────────────────────────

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoPickError('Nur JPEG, PNG und WebP erlaubt')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoPickError('Datei zu groß. Maximal 5 MB erlaubt.')
      return
    }
    setPhotoPickError(null)
    if (pendingPhotoPreview) URL.revokeObjectURL(pendingPhotoPreview)
    setPendingPhotoFile(file)
    setPendingPhotoPreview(URL.createObjectURL(file))
  }

  // ── Audio ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current !== null) clearInterval(timerIntervalRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  function clearTimer() {
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
  }

  async function startRecording() {
    setAudioError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder
      audioChunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(blob)
        setAudioUrl(URL.createObjectURL(blob))
        setAudioStatus('preview')
        stream.getTracks().forEach((t) => t.stop())
        streamRef.current = null
      }

      recorder.start()
      setAudioStatus('recording')
      setAudioTimer(0)
      let tick = 0
      timerIntervalRef.current = setInterval(() => {
        tick++
        setAudioTimer(tick)
        if (tick >= 45) {
          clearTimer()
          if (recorder.state !== 'inactive') recorder.stop()
        }
      }, 1000)
    } catch {
      setAudioError('Mikrofon nicht verfügbar')
    }
  }

  function stopRecording() {
    clearTimer()
    if (mediaRecorderRef.current?.state !== 'inactive') mediaRecorderRef.current?.stop()
  }

  function discardAudio() {
    if (audioUrl?.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setAudioTimer(0)
    setAudioError(null)
    setAudioStatus('none')
  }

  async function uploadAudio() {
    if (!audioBlob) return
    setAudioStatus('uploading')
    setAudioError(null)
    const base = (audioBlob as File).type || 'audio/webm'
    const ext = base.startsWith('audio/ogg') ? '.ogg'
              : base.startsWith('audio/mp4') ? '.m4a'
              : base.startsWith('audio/wav') ? '.wav'
              : base.startsWith('audio/mpeg') ? '.mp3'
              : '.webm'
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, `recording${ext}`)
      const { accessToken: freshToken } = await fetchApi<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
      useAuthStore.getState().setAccessToken(freshToken)
      const uploadUrl = `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'}/profile/audio`
      const res = await fetch(uploadUrl, {
        method: 'POST',
        credentials: 'include',
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string }
        throw new Error(body.message ?? 'Audio-Upload fehlgeschlagen')
      }
      if (audioUrl?.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
      setAudioBlob(null)
      setAudioUrl(null)
      setAudioStatus('pending')
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Fehler beim Hochladen')
      setAudioStatus('preview')
    }
  }

  async function deleteAudio() {
    try {
      await fetchApi<void>('/profile/audio', { method: 'DELETE' })
      if (audioUrl?.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
      setAudioUrl(null)
      setAudioBlob(null)
      setAudioStatus('none')
    } catch (err) {
      setAudioError(err instanceof Error ? err.message : 'Fehler beim Löschen')
    }
  }

  function handleAudioFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setAudioError('Datei zu groß. Maximal 5 MB erlaubt.')
      return
    }
    setAudioError(null)
    if (audioUrl?.startsWith('blob:')) URL.revokeObjectURL(audioUrl)
    setAudioBlob(file)
    setAudioUrl(URL.createObjectURL(file))
    setAudioStatus('preview')
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const selectedIds = new Set(userInterests.map((ui) => ui.interest_id))

  // ── Loading / error ───────────────────────────────────────────────────────

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

  // ── Render ────────────────────────────────────────────────────────────────

  const displayPhoto = pendingPhotoPreview ?? photoUrl

  return (
    <main className="min-h-screen bg-background pb-28 md:pb-8">
      <div className="max-w-md mx-auto px-6 py-8">
        <div className="flex flex-col items-center">

          {/* ── Photo ──────────────────────────────────────────────────────── */}
          <div className="relative w-full aspect-square mb-5">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt="Profilbild"
                className={`w-full h-full object-cover rounded-3xl${profile.photo_needs_review && !pendingPhotoPreview ? ' ring-2 ring-error' : ''}`}
              />
            ) : (
              <div className="w-full h-full rounded-3xl bg-surface-container-high flex items-center justify-center">
                <span className="text-8xl font-bold text-on-surface-variant select-none">
                  {profile.nickname.charAt(0).toUpperCase()}
                </span>
              </div>
            )}

            {profile.photo_needs_review && !pendingPhotoPreview && photoUrl && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-error/80 text-white text-xs font-semibold px-3 py-1.5 rounded-full backdrop-blur-sm whitespace-nowrap pointer-events-none">
                Wird überprüft
              </div>
            )}

            {editMode && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={saving}
                className="absolute inset-0 rounded-3xl bg-black/40 flex items-center justify-center focus:outline-none disabled:cursor-not-allowed"
                aria-label="Profilbild ändern"
              >
                {photoUploading ? (
                  <Loader2 className="h-10 w-10 text-white animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-10 w-10 text-white/80" aria-hidden="true" />
                )}
              </button>
            )}

            {/* Nickname + age — bottom left */}
            <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-xl">
              {editMode ? (
                <input
                  type="text"
                  value={draft.nickname}
                  onChange={(e) => setDraft((d) => ({ ...d, nickname: e.target.value }))}
                  maxLength={50}
                  className="bg-transparent text-white text-xl font-bold w-32 focus:outline-none placeholder-white/50 border-b border-white/30"
                  placeholder="Nickname"
                  aria-label="Nickname"
                />
              ) : (
                <h1 className="text-2xl font-bold text-white leading-tight">{profile.nickname}</h1>
              )}
              {profile.birthdate && (
                <p className="text-sm text-white/70 mt-0.5">{calcAge(profile.birthdate)} Jahre</p>
              )}
            </div>

            {/* Location + online — bottom right */}
            <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-2 rounded-xl">
              <div className="flex items-center gap-1.5 text-white text-sm mb-1">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                {editMode ? (
                  <input
                    type="text"
                    value={draft.city}
                    onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                    maxLength={100}
                    className="bg-transparent text-white text-sm w-20 focus:outline-none placeholder-white/50 border-b border-white/30"
                    placeholder="Stadt"
                    aria-label="Stadt"
                  />
                ) : (
                  <span>{profile.city ?? '—'}</span>
                )}
              </div>
              <OnlineIndicator
                is_online={profile.status_visible}
                status_message={profile.status_message}
                size="sm"
              />
            </div>
          </div>

          {editMode && draft.nickname !== originalNickname.current && (
            <p className="w-full text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-xl px-3 py-2 mb-1" role="alert">
              ⚠ Achtung: Du kannst deinen Nickname nur einmal pro Jahr ändern.
            </p>
          )}

          {photoPickError && (
            <p className="text-xs text-error mb-3 self-start" role="alert">{photoPickError}</p>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoSelect}
            aria-hidden="true"
          />

          {/* ── Gender + looking_for (edit mode) ──────────────────────────── */}
          {editMode && (
            <div className="w-full space-y-3 mb-5">
              <div className="space-y-1.5">
                <div className="relative">
                  <select
                    value={draft.gender}
                    onChange={(e) => setDraft((d) => ({ ...d, gender: e.target.value }))}
                    className="w-full appearance-none pl-4 pr-8 py-3 rounded-2xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim transition-colors cursor-pointer"
                    aria-label="Geschlecht"
                  >
                    <option value="">Geschlecht — Keine Angabe</option>
                    <option value="male">Mann</option>
                    <option value="female">Frau</option>
                    <option value="non_binary">Non-Binary</option>
                    <option value="diverse">Divers</option>
                  </select>
                  <ChevronDown
                    className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none"
                    aria-hidden="true"
                  />
                </div>
                {draft.gender !== originalGender.current && (
                  <p className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/30 rounded-xl px-3 py-2" role="alert">
                    ⚠ Achtung: Du kannst dein Geschlecht nur einmal pro Jahr ändern.
                  </p>
                )}
              </div>
              <div className="relative">
                <select
                  value={draft.looking_for}
                  onChange={(e) => setDraft((d) => ({ ...d, looking_for: e.target.value }))}
                  className="w-full appearance-none pl-4 pr-8 py-3 rounded-2xl bg-surface-container border border-outline-variant text-on-surface text-sm focus:outline-none focus:border-primary-fixed-dim transition-colors cursor-pointer"
                  aria-label="Suche nach"
                >
                  <option value="">Suche nach — Keine Angabe</option>
                  <option value="friendship">Freundschaft</option>
                  <option value="relationship">Beziehung</option>
                  <option value="exchange">Austausch</option>
                  <option value="all">Alles offen</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none"
                  aria-hidden="true"
                />
              </div>
            </div>
          )}

          {/* ── Audio ────────────────────────────────────────────────────── */}
          <div className="w-full mb-5">
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide text-center mb-3">
              Vorstellung
            </p>

            {audioStatus === 'none' && (
              <div className="flex gap-2 justify-center flex-wrap">
                <button
                  type="button"
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container-high transition-colors min-h-[44px]"
                >
                  <Mic className="h-4 w-4" aria-hidden="true" />
                  Aufnehmen
                </button>
                <button
                  type="button"
                  onClick={() => audioFileRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container-high transition-colors min-h-[44px]"
                >
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  Datei wählen
                </button>
              </div>
            )}

            {audioStatus === 'recording' && (
              <div className="flex items-center justify-center gap-4">
                <span className="flex items-center gap-2 text-error font-medium text-sm">
                  <span className="h-2 w-2 rounded-full bg-error animate-pulse" aria-hidden="true" />
                  {formatTimer(audioTimer)}
                  <span className="text-on-surface-variant text-xs font-normal">/ 00:45</span>
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-error-container text-error text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px]"
                >
                  <Square className="h-4 w-4" aria-hidden="true" />
                  Stop
                </button>
              </div>
            )}

            {audioStatus === 'preview' && audioUrl && (
              <div className="space-y-3">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={audioUrl} className="w-full rounded-xl" />
                <div className="flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={discardAudio}
                    className="px-4 py-2.5 rounded-full border border-outline-variant text-on-surface text-sm font-medium hover:bg-surface-container-high transition-colors min-h-[44px]"
                  >
                    Nochmal
                  </button>
                  <button
                    type="button"
                    onClick={uploadAudio}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary-fixed-dim text-on-primary-container text-sm font-medium hover:opacity-90 transition-opacity min-h-[44px]"
                  >
                    Hochladen
                  </button>
                </div>
              </div>
            )}

            {audioStatus === 'uploading' && (
              <div className="flex items-center justify-center gap-2 text-on-surface-variant text-sm py-3">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Wird hochgeladen…
              </div>
            )}

            {audioStatus === 'pending' && (
              <div className="flex flex-col items-center gap-3">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container text-on-surface-variant text-xs font-medium">
                  <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                  Warte auf Freigabe
                </span>
                <button
                  type="button"
                  onClick={() => setAudioStatus('none')}
                  className="text-xs text-on-surface-variant underline hover:text-on-surface transition-colors"
                >
                  Ersetzen
                </button>
              </div>
            )}

            {audioStatus === 'approved' && audioUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-on-surface-variant">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary-fixed-dim" aria-hidden="true" />
                    Freigegeben
                  </span>
                  <button
                    type="button"
                    onClick={deleteAudio}
                    className="flex items-center gap-1 text-xs text-error hover:underline transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Löschen
                  </button>
                </div>
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <audio controls src={audioUrl} className="w-full rounded-xl" />
              </div>
            )}

            {audioStatus === 'rejected' && (
              <div className="flex flex-col items-center gap-3">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error-container text-error text-xs font-medium">
                  <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                  Abgelehnt
                </span>
                <button
                  type="button"
                  onClick={() => setAudioStatus('none')}
                  className="text-xs text-on-surface-variant underline hover:text-on-surface transition-colors"
                >
                  Neue Aufnahme
                </button>
              </div>
            )}

            {audioError && (
              <p className="text-xs text-error mt-2 text-center" role="alert">{audioError}</p>
            )}

            <input
              ref={audioFileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleAudioFileSelect}
              aria-hidden="true"
            />
          </div>

          {/* ── Bio ───────────────────────────────────────────────────────── */}
          <div className="w-full bg-surface-container rounded-2xl p-6 mb-5">
            {editMode ? (
              <>
                <textarea
                  value={draft.bio}
                  onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
                  rows={4}
                  maxLength={1000}
                  className="w-full bg-transparent text-on-surface text-sm leading-relaxed text-center focus:outline-none resize-none placeholder:text-on-surface-variant"
                  placeholder="Erzähl etwas über dich…"
                  aria-label="Bio"
                />
                <p className="text-xs text-on-surface-variant text-right mt-1" aria-live="polite">
                  {draft.bio.length}/1000
                </p>
              </>
            ) : (
              <p className={`leading-relaxed text-center ${profile.bio ? 'text-on-surface' : 'text-on-surface-variant italic text-sm'}`}>
                {profile.bio ?? 'Noch keine Bio hinzugefügt.'}
              </p>
            )}
          </div>

          {/* ── Interests ─────────────────────────────────────────────────── */}
          <div className="w-full mb-6">
            <h3 className="text-xs font-medium text-on-surface-variant mb-3 text-center uppercase tracking-wide">
              Interessen
            </h3>
            <div className="flex flex-wrap gap-2 justify-center">
              {editMode ? (
                allInterests.length > 0 ? (
                  allInterests.map((i) => {
                    const selected = selectedIds.has(i.id)
                    const pending  = interestLoading === i.id
                    return (
                      <button
                        key={i.id}
                        type="button"
                        onClick={() => handleToggleInterest(i.id)}
                        disabled={interestLoading !== null}
                        aria-pressed={selected}
                        className={`px-4 py-2 rounded-full text-sm transition-colors disabled:cursor-not-allowed ${
                          selected
                            ? 'bg-primary-fixed-dim text-on-primary-container'
                            : 'bg-surface-container-high text-on-surface hover:opacity-80 disabled:opacity-50'
                        }`}
                      >
                        {pending
                          ? <Loader2 className="h-3 w-3 animate-spin inline" aria-hidden="true" />
                          : i.name_de}
                      </button>
                    )
                  })
                ) : (
                  <p className="text-sm text-on-surface-variant italic">Keine Interessen verfügbar.</p>
                )
              ) : (
                userInterests.length > 0 ? (
                  userInterests.map((ui) => (
                    <span
                      key={ui.interest_id}
                      className="px-4 py-2 rounded-full bg-surface-container-high text-on-surface text-sm"
                    >
                      {ui.interest.name_de}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-on-surface-variant italic">Noch keine Interessen hinzugefügt.</p>
                )
              )}
            </div>
          </div>

          {/* ── is_published toggle (edit mode only) ──────────────────────── */}
          {editMode && (
            <div className="w-full flex items-center justify-between px-1 mb-5">
              <div>
                <p className="text-sm font-medium text-on-surface">Profil sichtbar</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  {draft.is_published
                    ? 'Öffentlich — andere können dich finden'
                    : 'Privat — nur du siehst dein Profil'}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={draft.is_published}
                onClick={() => setDraft((d) => ({ ...d, is_published: !d.is_published }))}
                disabled={!profile.onboarding_completed && !draft.is_published}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed ${
                  draft.is_published ? 'bg-primary-fixed-dim' : 'bg-surface-container-high'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-sm transition duration-200 ${
                    draft.is_published ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {saveError && (
            <div className="w-full flex items-center gap-2 rounded-xl bg-error-container text-error px-4 py-3 text-sm mb-4" role="alert">
              <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              {saveError}
            </div>
          )}

          {/* ── Action buttons ────────────────────────────────────────────── */}
          {editMode ? (
            <div className="w-full flex gap-3">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex-1 py-4 rounded-full border border-outline-variant text-on-surface font-semibold hover:bg-surface-container transition-colors disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !draft.nickname.trim()}
                className="flex-1 py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Speichern
              </button>
            </div>
          ) : (
            <button
              onClick={startEdit}
              className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold hover:opacity-90 active:scale-95 transition-all"
            >
              Bearbeiten
            </button>
          )}

        </div>
      </div>
    </main>
  )
}
