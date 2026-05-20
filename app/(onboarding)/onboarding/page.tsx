'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, ChevronDown, ChevronLeft, Loader2, Sparkles } from 'lucide-react'
import { fetchApi } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interest {
  id: string
  name_de: string
  name_en: string
  category?: string
}

interface FormData {
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

// ─── Progress bar ─────────────────────────────────────────────────────────────

const TOTAL_STEPS = 5

function ProgressBar({ step }: { step: number }) {
  return (
    <div
      className="flex gap-1.5 mb-8"
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
  return (
    <div className="text-center space-y-8">
      <div className="flex justify-center">
        <div className="h-24 w-24 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center">
          <Sparkles className="h-11 w-11 text-primary-fixed-dim" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold text-on-surface">Willkommen bei XXX!</h1>
        <p className="text-on-surface-variant leading-relaxed">
          Hier findest du Menschen in deiner Nähe, die ähnliche Interessen teilen.
          Richte in wenigen Schritten dein Profil ein – dann bist du dabei!
        </p>
      </div>
      <button
        onClick={onNext}
        className="w-full py-4 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-base min-h-[52px] hover:opacity-90 active:scale-[0.98] transition-all"
      >
        Loslegen
      </button>
    </div>
  )
}

// ─── Step 2: Nickname ─────────────────────────────────────────────────────────

function StepNickname({
  value,
  onChange,
  onNext,
}: {
  value: string
  onChange: (v: string) => void
  onNext: () => void
}) {
  const [touched, setTouched] = useState(false)
  const error = touched ? validateNickname(value) : null

  function handleNext() {
    setTouched(true)
    if (!validateNickname(value)) onNext()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-on-surface">Wie soll man dich nennen?</h2>
        <p className="text-on-surface-variant text-sm">
          Dein Nickname ist dein öffentlicher Name auf XXX.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="nickname" className="text-sm font-medium text-on-surface">
          Nickname
        </label>
        <input
          id="nickname"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={() => setTouched(true)}
          placeholder="z.B. coolcat99"
          maxLength={30}
          autoComplete="username"
          className={`w-full rounded-2xl bg-surface-container border px-4 py-3.5 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-fixed-dim min-h-[52px] transition-colors ${
            error ? 'border-error' : 'border-outline-variant'
          }`}
          aria-describedby={error ? 'nickname-error' : 'nickname-hint'}
          aria-invalid={error ? 'true' : 'false'}
        />
        {error ? (
          <p id="nickname-error" className="text-xs text-error flex items-center gap-1.5" role="alert">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : (
          <p id="nickname-hint" className="text-xs text-on-surface-variant">
            3–30 Zeichen · Buchstaben, Ziffern, _, - und .
          </p>
        )}
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

// ─── Step 3: Basic info ───────────────────────────────────────────────────────

function StepBasicInfo({
  birthdate,
  city,
  bio,
  gender,
  lookingFor,
  onChangeBirthdate,
  onChangeCity,
  onChangeBio,
  onChangeGender,
  onChangeLookingFor,
  onNext,
}: {
  birthdate: string
  city: string
  bio: string
  gender: string
  lookingFor: string
  onChangeBirthdate: (v: string) => void
  onChangeCity: (v: string) => void
  onChangeBio: (v: string) => void
  onChangeGender: (v: string) => void
  onChangeLookingFor: (v: string) => void
  onNext: () => void
}) {
  const [touched, setTouched] = useState({ birthdate: false, city: false })

  const maxDate = useMemo(() => {
    const d = new Date()
    d.setFullYear(d.getFullYear() - 18)
    return d.toISOString().split('T')[0]
  }, [])

  const birthdateError = touched.birthdate
    ? !birthdate
      ? 'Geburtsdatum ist erforderlich'
      : !isAtLeast18(birthdate)
      ? 'Du musst mindestens 18 Jahre alt sein'
      : null
    : null

  const cityError = touched.city && !city.trim() ? 'Stadt ist erforderlich' : null

  function handleNext() {
    setTouched({ birthdate: true, city: true })
    if (birthdate && isAtLeast18(birthdate) && city.trim()) onNext()
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-on-surface">Ein paar Infos über dich</h2>
        <p className="text-on-surface-variant text-sm">
          Diese Angaben helfen anderen, dich zu finden.
        </p>
      </div>

      {/* Birthdate */}
      <div className="space-y-1.5">
        <label htmlFor="birthdate" className="text-sm font-medium text-on-surface">
          Geburtsdatum{' '}
          <span className="text-error" aria-hidden="true">*</span>
        </label>
        <input
          id="birthdate"
          type="date"
          value={birthdate}
          max={maxDate}
          onChange={(e) => onChangeBirthdate(e.target.value)}
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
          Stadt{' '}
          <span className="text-error" aria-hidden="true">*</span>
        </label>
        <input
          id="city"
          type="text"
          value={city}
          onChange={(e) => onChangeCity(e.target.value)}
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
          value={bio}
          onChange={(e) => onChangeBio(e.target.value)}
          placeholder="Erzähl ein bisschen über dich…"
          maxLength={1000}
          rows={3}
          className="w-full rounded-2xl bg-surface-container border border-outline-variant px-4 py-3.5 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary-fixed-dim transition-colors resize-none"
          aria-describedby="bio-count"
        />
        <p id="bio-count" className="text-xs text-on-surface-variant text-right">
          {bio.length}/1000
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
            value={gender}
            onChange={(e) => onChangeGender(e.target.value)}
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
            value={lookingFor}
            onChange={(e) => onChangeLookingFor(e.target.value)}
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
  const [attempted, setAttempted] = useState(false)
  const hasError = attempted && selectedIds.length === 0

  function handleNext() {
    setAttempted(true)
    if (selectedIds.length > 0) onNext()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-on-surface">Was interessiert dich?</h2>
        <p className="text-on-surface-variant text-sm">
          Wähle mindestens ein Interesse aus – so findest du Gleichgesinnte.
        </p>
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
        Weiter
      </button>
    </div>
  )
}

// ─── Step 5: Done (save + redirect) ──────────────────────────────────────────

function StepDone({ formData }: { formData: FormData }) {
  const router = useRouter()
  const [status, setStatus] = useState<'saving' | 'success' | 'error'>('saving')
  const [saveError, setSaveError] = useState<string | null>(null)
  const savedOnce = useRef(false)

  const save = useCallback(async () => {
    setStatus('saving')
    setSaveError(null)
    try {
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
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err) {
      setStatus('error')
      setSaveError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
    }
  }, [formData, router])

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
    <div className="text-center space-y-6 py-8">
      <div className="flex justify-center">
        <div className="h-16 w-16 rounded-full bg-primary-fixed-dim/20 flex items-center justify-center">
          <Check className="h-8 w-8 text-primary-fixed-dim" aria-hidden="true" />
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-on-surface">Willkommen an Bord!</h2>
        <p className="text-on-surface-variant">Dein Profil ist bereit. Du wirst weitergeleitet…</p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    nickname:   '',
    birthdate:  '',
    city:       '',
    bio:        '',
    gender:     '',
    looking_for: '',
    interestIds: [],
  })
  const [interests, setInterests] = useState<Interest[]>([])
  const [loadingInterests, setLoadingInterests] = useState(true)

  useEffect(() => {
    fetchApi<Interest[]>('/profile/interests')
      .then(setInterests)
      .catch(() => {/* silently handled — user will see empty list */})
      .finally(() => setLoadingInterests(false))
  }, [])

  function update<K extends keyof FormData>(key: K, value: FormData[K]) {
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

  function next() {
    setStep((s) => Math.min(s + 1, TOTAL_STEPS))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 1))
  }

  return (
    <div>
      <ProgressBar step={step} />

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
        <StepNickname
          value={formData.nickname}
          onChange={(v) => update('nickname', v)}
          onNext={next}
        />
      )}

      {step === 3 && (
        <StepBasicInfo
          birthdate={formData.birthdate}
          city={formData.city}
          bio={formData.bio}
          gender={formData.gender}
          lookingFor={formData.looking_for}
          onChangeBirthdate={(v) => update('birthdate', v)}
          onChangeCity={(v) => update('city', v)}
          onChangeBio={(v) => update('bio', v)}
          onChangeGender={(v) => update('gender', v)}
          onChangeLookingFor={(v) => update('looking_for', v)}
          onNext={next}
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

      {step === TOTAL_STEPS && <StepDone formData={formData} />}
    </div>
  )
}
