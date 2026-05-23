'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Camera, Check, ChevronDown, ChevronLeft, Loader2, Sparkles } from 'lucide-react'
import { fetchApi } from '@/lib/api'
import { useAuthStore } from '@/lib/store/authStore'
import { useTranslation } from '@/hooks/useTranslation'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interest {
  id: string
  name_de: string
  name_en: string
  category?: string
}

// Renamed from FormData to avoid shadowing the global FormData constructor
// used for multipart photo uploads in StepDone.
interface ProfileFormData {
  nickname: string
  birthdate: string
  city: string
  bio: string
  gender: string
  looking_for: string
  interestIds: string[]
}

// ─── Validation ───────────────────────────────────────────────────────────────

const NICKNAME_RE = /^[a-zA-Z0-9_\-.]{3,30}$/

function validateNickname(v: string): string | null {
  if (!v) return 'Nickname ist erforderlich'
  if (v.length < 3) return 'Mindestens 3 Zeichen erforderlich'
  if (v.length > 30) return 'Maximal 30 Zeichen erlaubt'
  if (!NICKNAME_RE.test(v)) return 'Nur Buchstaben, Ziffern, _, - und . erlaubt'
  return null
}

function isAtLeast18(dateStr: string): boolean {
  if (!dateStr) return false
  const birth = new Date(dateStr)
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() - 18)
  return birth <= cutoff
}

// ─── Progress ─────────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

function ProgressBar({ step }: { step: number }) {
  return (
    <div
      className="flex gap-1.5 mb-6"
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={TOTAL_STEPS}
      aria-label={`Schritt ${step} von ${TOTAL_STEPS}`}
    >
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div
          key={i}
          className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
            i < step ? 'bg-primary-fixed-dim' : 'bg-surface-container-high'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Step 1: Welcome ──────────────────────────────────────────────────────────

function StepWelcome({ onNext }: { onNext: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="text-center space-y-8">
      <div className="flex justify-center">
        <div className="h-24 w-24 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center">
          <Sparkles className="h-11 w-11 text-primary-fixed-dim" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-on-surface">{t.onboarding.welcomeTitle}</h1>
        <p className="text-on-surface-variant leading-relaxed">{t.onboarding.welcomeBody}</p>
      </div>
      <button
        onClick={onNext}
        className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-base min-h-[52px] hover:opacity-90 active:scale-[0.98] transition-all"
      >
        {t.onboarding.start}
      </button>
    </div>
  )
}

// ─── Step 2: Profile info (Nickname + Birthdate + City + optional fields) ─────

function StepProfileInfo({
  formData,
  onChange,
  onNext,
}: {
  formData: ProfileFormData
  onChange: <K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) => void
  onNext: () => void
}) {
  const [touched, setTouched] = useState({ nickname: false, birthdate: false, city: false })

  const maxDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().split('T')[0]
  }, [])

  const nicknameError = touched.nickname ? validateNickname(formData.nickname) : null
  const birthdateError = touched.birthdate
    ? !formData.birthdate
      ? 'Geburtsdatum ist erforderlich'
      : !isAtLeast18(formData.birthdate)
      ? 'Du musst mindestens 18 Jahre alt sein'
      : null
    : null
  const cityError = touched.city && !formData.city.trim() ? 'Stadt ist erforderlich' : null

  function handleNext() {
    setTouched({ nickname: true, birthdate: true, city: true })
    if (
      !validateNickname(formData.nickname) &&
      formData.birthdate && isAtLeast18(formData.birthdate) &&
      formData.city.trim()
    ) {
      onNext()
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-on-surface">Erstelle dein Profil</h2>
        <p className="text-on-surface-variant text-sm">
          Diese Angaben helfen anderen, dich zu finden.
        </p>
      </div>

      {/* Nickname */}
      <div className="space-y-1.5">
        <label htmlFor="nickname" className="text-sm font-medium text-on-surface">
          Nickname <span className="text-error" aria-hidden="true">*</span>
        </label>
        <input
          id="nickname"
          type="text"
          value={formData.nickname}
          onChange={(e) => onChange('nickname', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, nickname: true }))}
          placeholder="z.B. coolcat99"
          maxLength={30}
          autoComplete="username"
          className={`w-full rounded-2xl bg-surface-container border px-4 py-3.5 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-fixed-dim min-h-[52px] transition-colors ${
            nicknameError ? 'border-error' : 'border-outline-variant'
          }`}
          aria-describedby={nicknameError ? 'nickname-error' : 'nickname-hint'}
          aria-invalid={nicknameError ? 'true' : 'false'}
          aria-required="true"
        />
        {nicknameError ? (
          <p id="nickname-error" className="text-xs text-error flex items-center gap-1.5" role="alert">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            {nicknameError}
          </p>
        ) : (
          <p id="nickname-hint" className="text-xs text-on-surface-variant">
            3–30 Zeichen · Buchstaben, Ziffern, _, - und .
          </p>
        )}
      </div>

      {/* Birthdate */}
      <div className="space-y-1.5">
        <label htmlFor="birthdate" className="text-sm font-medium text-on-surface">
          Geburtsdatum <span className="text-error" aria-hidden="true">*</span>
        </label>
        <input
          id="birthdate"
          type="date"
          value={formData.birthdate}
          max={maxDate}
          onChange={(e) => onChange('birthdate', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, birthdate: true }))}
          className={`w-full rounded-2xl bg-surface-container border px-4 py-3.5 text-on-surface focus:outline-none focus:border-primary-fixed-dim min-h-[52px] transition-colors ${
            birthdateError ? 'border-error' : 'border-outline-variant'
          }`}
          aria-describedby={birthdateError ? 'birthdate-error' : undefined}
          aria-invalid={birthdateError ? 'true' : 'false'}
          aria-required="true"
        />
        {birthdateError && (
          <p id="birthdate-error" className="text-xs text-error flex items-center gap-1.5" role="alert">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            {birthdateError}
          </p>
        )}
      </div>

      {/* City */}
      <div className="space-y-1.5">
        <label htmlFor="city" className="text-sm font-medium text-on-surface">
          Stadt <span className="text-error" aria-hidden="true">*</span>
        </label>
        <input
          id="city"
          type="text"
          value={formData.city}
          onChange={(e) => onChange('city', e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, city: true }))}
          placeholder="z.B. Berlin"
          maxLength={100}
          autoComplete="address-level2"
          className={`w-full rounded-2xl bg-surface-container border px-4 py-3.5 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-fixed-dim min-h-[52px] transition-colors ${
            cityError ? 'border-error' : 'border-outline-variant'
          }`}
          aria-describedby={cityError ? 'city-error' : undefined}
          aria-invalid={cityError ? 'true' : 'false'}
          aria-required="true"
        />
        {cityError && (
          <p id="city-error" className="text-xs text-error flex items-center gap-1.5" role="alert">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            {cityError}
          </p>
        )}
      </div>

      {/* Bio */}
      <div className="space-y-1.5">
        <label htmlFor="bio" className="text-sm font-medium text-on-surface">
          Über mich{' '}
          <span className="text-xs text-on-surface-variant font-normal">(optional)</span>
        </label>
        <textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => onChange('bio', e.target.value)}
          placeholder="Erzähl ein bisschen über dich…"
          maxLength={1000}
          rows={3}
          className="w-full rounded-2xl bg-surface-container border border-outline-variant px-4 py-3.5 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-fixed-dim transition-colors resize-none"
          aria-describedby="bio-count"
        />
        <p id="bio-count" className="text-xs text-on-surface-variant text-right">
          {formData.bio.length}/1000
        </p>
      </div>

      {/* Gender */}
      <div className="space-y-1.5">
        <label htmlFor="gender" className="text-sm font-medium text-on-surface">
          Geschlecht{' '}
          <span className="text-xs text-on-surface-variant font-normal">(optional)</span>
        </label>
        <div className="relative">
          <select
            id="gender"
            value={formData.gender}
            onChange={(e) => onChange('gender', e.target.value)}
            className="w-full appearance-none rounded-2xl bg-surface-container border border-outline-variant px-4 pr-10 py-3.5 text-on-surface focus:outline-none focus:border-primary-fixed-dim min-h-[52px] transition-colors cursor-pointer"
          >
            <option value="">Keine Angabe</option>
            <option value="male">Mann</option>
            <option value="female">Frau</option>
            <option value="non_binary">Non-Binary</option>
            <option value="diverse">Divers</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant"
            aria-hidden="true"
          />
        </div>
      </div>

      {/* Looking for */}
      <div className="space-y-1.5">
        <label htmlFor="looking-for" className="text-sm font-medium text-on-surface">
          Ich suche{' '}
          <span className="text-xs text-on-surface-variant font-normal">(optional)</span>
        </label>
        <div className="relative">
          <select
            id="looking-for"
            value={formData.looking_for}
            onChange={(e) => onChange('looking_for', e.target.value)}
            className="w-full appearance-none rounded-2xl bg-surface-container border border-outline-variant px-4 pr-10 py-3.5 text-on-surface focus:outline-none focus:border-primary-fixed-dim min-h-[52px] transition-colors cursor-pointer"
          >
            <option value="">Keine Angabe</option>
            <option value="friendship">Freundschaft</option>
            <option value="relationship">Beziehung</option>
            <option value="exchange">Austausch</option>
            <option value="all">Alles offen</option>
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant"
            aria-hidden="true"
          />
        </div>
      </div>

      <button
        onClick={handleNext}
        className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-base min-h-[52px] hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Weiter
      </button>
    </div>
  )
}

// ─── Step 3: Photo ────────────────────────────────────────────────────────────

function StepPhoto({
  onNext,
  onSkip,
}: {
  onNext: (file: File | null) => void
  onSkip: () => void
}) {
  const { t } = useTranslation()
  const fileInputRef              = useRef<HTMLInputElement>(null)
  const [file, setFile]           = useState<File | null>(null)
  const [preview, setPreview]     = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('Nur JPEG, PNG und WebP erlaubt')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      setError('Datei zu groß. Maximal 5 MB erlaubt.')
      return
    }
    setError(null)
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-2xl font-bold text-on-surface">{t.onboarding.stepPhoto}</h2>
        <p className="text-on-surface-variant text-sm">{t.onboarding.photoSubtitle}</p>
      </div>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="relative w-36 h-36 rounded-full overflow-hidden bg-surface-container border-2 border-dashed border-outline-variant hover:border-primary-fixed-dim transition-colors flex items-center justify-center"
          aria-label="Foto auswählen"
        >
          {preview ? (
            <img src={preview} alt="" className="w-full h-full object-cover" aria-hidden="true" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-on-surface-variant">
              <Camera className="h-8 w-8" aria-hidden="true" />
              <span className="text-xs font-medium">Foto wählen</span>
            </div>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleSelect}
          aria-hidden="true"
        />
      </div>

      {error && (
        <p className="text-xs text-error text-center flex items-center justify-center gap-1.5" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 py-4 rounded-full border border-outline-variant text-on-surface font-semibold text-base min-h-[52px] hover:bg-surface-container transition-colors"
        >
          {t.onboarding.skip}
        </button>
        <button
          onClick={() => onNext(file)}
          className="flex-1 py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-base min-h-[52px] hover:opacity-90 active:scale-[0.98] transition-all"
        >
          {t.onboarding.next}
        </button>
      </div>
    </div>
  )
}

// ─── Step 4: Interests ────────────────────────────────────────────────────────

function StepInterests({
  selectedIds,
  onToggle,
  interests,
  loading,
  onNext,
}: {
  selectedIds: string[]
  onToggle: (id: string) => void
  interests: Interest[]
  loading: boolean
  onNext: () => void
}) {
  const { t } = useTranslation()
  const [attempted, setAttempted] = useState(false)
  const hasError = attempted && selectedIds.length === 0

  function handleNext() {
    setAttempted(true)
    if (selectedIds.length > 0) onNext()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-on-surface">{t.onboarding.stepInterests}</h2>
        <p className="text-on-surface-variant text-sm">{t.onboarding.interestsSubtitle}</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10" aria-busy="true">
          <Loader2 className="h-8 w-8 text-on-surface-variant animate-spin" aria-label="Lädt Interessen" />
        </div>
      ) : (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Interessen auswählen">
          {interests.map((interest) => {
            const selected = selectedIds.includes(interest.id)
            return (
              <button
                key={interest.id}
                onClick={() => onToggle(interest.id)}
                aria-pressed={selected}
                className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all min-h-[44px] flex flex-col items-center leading-tight ${
                  selected
                    ? 'bg-primary-fixed-dim text-on-primary-container scale-[1.03]'
                    : 'bg-surface-container text-on-surface border border-outline-variant hover:border-primary-fixed-dim'
                }`}
              >
                <span>{interest.name_de}</span>
                {interest.category && (
                  <span className="text-[10px] opacity-60 font-normal">{interest.category}</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {hasError && (
        <p className="text-xs text-error flex items-center gap-1.5" role="alert">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          Bitte wähle mindestens ein Interesse aus
        </p>
      )}

      <button
        onClick={handleNext}
        disabled={loading}
        className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-base min-h-[52px] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 transition-all"
      >
        {t.onboarding.next}
      </button>
    </div>
  )
}

// ─── Step 5: Done (save + redirect) ──────────────────────────────────────────

function StepDone({
  formData,
  photoFile,
}: {
  formData: ProfileFormData
  photoFile: File | null
}) {
  const { t } = useTranslation()
  const router = useRouter()
  const [status, setStatus]       = useState<'saving' | 'success' | 'error'>('saving')
  const [saveError, setSaveError] = useState<string | null>(null)
  const savedOnce = useRef(false)

  const save = useCallback(async () => {
    setStatus('saving')
    setSaveError(null)
    try {
      // Photo upload (optional)
      if (photoFile) {
        const { accessToken: freshToken } = await fetchApi<{ accessToken: string }>('/auth/refresh', { method: 'POST' })
        useAuthStore.getState().setAccessToken(freshToken)
        const fd = new FormData()
        fd.append('file', photoFile)
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'}/media/upload/profile-photo`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { Authorization: `Bearer ${freshToken}` },
            body: fd,
          }
        )
        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { message?: string }
          throw new Error(body.message ?? 'Foto-Upload fehlgeschlagen')
        }
      }

      // Interests must be added before PUT so that checkAndCompleteOnboarding
      // (triggered by PUT) finds them and sets onboarding_completed = true.
      for (const id of formData.interestIds) {
        await fetchApi<unknown>(`/profile/me/interests/${id}`, { method: 'POST' })
      }

      await fetchApi<unknown>('/profile/me', {
        method: 'PUT',
        body: JSON.stringify({
          nickname:   formData.nickname,
          birthdate:  formData.birthdate,
          city:       formData.city,
          ...(formData.bio         ? { bio:         formData.bio }         : {}),
          ...(formData.gender      ? { gender:      formData.gender }      : {}),
          ...(formData.looking_for ? { looking_for: formData.looking_for } : {}),
        }),
      })

      await fetchApi<unknown>('/profile/me/publish', { method: 'PATCH' })

      setStatus('success')
    } catch (err) {
      setStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    }
  }, [formData, photoFile])

  useEffect(() => {
    if (savedOnce.current) return
    savedOnce.current = true
    save()
  }, [save])

  if (status === 'saving') {
    return (
      <div className="text-center space-y-6 py-8">
        <Loader2
          className="h-14 w-14 text-primary-fixed-dim animate-spin mx-auto"
          aria-hidden="true"
        />
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-on-surface">Fast fertig…</h2>
          <p className="text-on-surface-variant">Wir richten dein Profil ein.</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="text-center space-y-6 py-8">
        <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-error-container flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-error" aria-hidden="true" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-on-surface">Etwas ist schiefgelaufen</h2>
          <p className="text-on-surface-variant text-sm">{saveError}</p>
        </div>
        <button
          onClick={save}
          className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-base min-h-[52px] hover:opacity-90 active:scale-[0.98] transition-all"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="text-center space-y-8 py-4">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center">
          <Check className="h-8 w-8 text-primary-fixed-dim" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-3">
        <h2 className="text-2xl font-bold text-on-surface">{t.onboarding.doneTitle}</h2>
        <p className="text-on-surface-variant leading-relaxed text-sm">{t.onboarding.doneBody}</p>
      </div>
      <button
        onClick={() => router.push('/discover')}
        className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-base min-h-[52px] hover:opacity-90 active:scale-[0.98] transition-all"
      >
        {t.onboarding.discover}
      </button>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<ProfileFormData>({
    nickname:    '',
    birthdate:   '',
    city:        '',
    bio:         '',
    gender:      '',
    looking_for: '',
    interestIds: [],
  })
  const [photoFile, setPhotoFile]               = useState<File | null>(null)
  const [interests, setInterests]               = useState<Interest[]>([])
  const [loadingInterests, setLoadingInterests] = useState(true)

  useEffect(() => {
    fetchApi<Interest[]>('/profile/interests')
      .then(setInterests)
      .catch(() => {})
      .finally(() => setLoadingInterests(false))
  }, [])

  function update<K extends keyof ProfileFormData>(key: K, value: ProfileFormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function toggleInterest(id: string) {
    setFormData((prev) => ({
      ...prev,
      interestIds: prev.interestIds.includes(id)
        ? prev.interestIds.filter((i) => i !== id)
        : [...prev.interestIds, id],
    }))
  }

  function next() { setStep((s) => Math.min(s + 1, TOTAL_STEPS)) }
  function back() { setStep((s) => Math.max(s - 1, 1)) }

  function handlePhotoNext(file: File | null) {
    setPhotoFile(file)
    next()
  }

  return (
    <div>
      {step < TOTAL_STEPS && (
        <>
          <p className="text-xs text-on-surface-variant text-center mb-3 font-medium">
            Schritt {step} von {TOTAL_STEPS}
          </p>
          <ProgressBar step={step} />
        </>
      )}

      {step > 1 && step < TOTAL_STEPS && (
        <button
          onClick={back}
          className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface transition-colors mb-6 min-h-[44px] -ml-1 px-1"
          aria-label="Zurück"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-medium">Zurück</span>
        </button>
      )}

      {step === 1 && <StepWelcome onNext={next} />}

      {step === 2 && (
        <StepProfileInfo
          formData={formData}
          onChange={update}
          onNext={next}
        />
      )}

      {step === 3 && (
        <StepPhoto
          onNext={handlePhotoNext}
          onSkip={() => { setPhotoFile(null); next() }}
        />
      )}

      {step === 4 && (
        <StepInterests
          selectedIds={formData.interestIds}
          onToggle={toggleInterest}
          interests={interests}
          loading={loadingInterests}
          onNext={next}
        />
      )}

      {step === TOTAL_STEPS && (
        <StepDone
          formData={formData}
          photoFile={photoFile}
        />
      )}
    </div>
  )
}
