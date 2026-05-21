'use client'

import { useState } from 'react'
import type { ElementType } from 'react'
import {
  UserCheck, MessageCircle, SlidersHorizontal, Bell, Shield,
  Lock, ShieldAlert, CreditCard, Accessibility,
  Phone, Mail, AtSign, MessageSquare,
  Check, Zap, Star, Layers, Building2, Globe, ArrowRight,
  Sun, Moon, ChevronDown,
} from 'lucide-react'
import { useThemeStore } from '@/lib/store/themeStore'

type Lang = 'de' | 'en'
type TierKey = 'core' | 'connect' | 'premium'

// ─── Static data ─────────────────────────────────────────────────────────────

interface FeatureDef {
  icon: ElementType
  de: { title: string; desc: string }
  en: { title: string; desc: string }
}

interface TierDef {
  key: TierKey
  icon: ElementType
  de: { title: string; desc: string; badge?: string; items: string[] }
  en: { title: string; desc: string; badge?: string; items: string[] }
}

interface ContactDef {
  icon: ElementType
  label: string
  value: string
  href: string
}

const FEATURES: FeatureDef[] = [
  {
    icon: UserCheck,
    de: { title: 'Profil-System', desc: 'Foto-Upload, Interessen, Barrierefreiheits-Einstellungen und Sichtbarkeits-Kontrolle.' },
    en: { title: 'Profile System', desc: 'Photo upload, interests, accessibility settings, and visibility control.' },
  },
  {
    icon: MessageCircle,
    de: { title: 'Echtzeit-Chat', desc: 'WebSocket-basiert mit Kontaktanfragen-System und vollständigem Nachrichtenverlauf.' },
    en: { title: 'Real-Time Chat', desc: 'WebSocket-powered with contact requests and full message history.' },
  },
  {
    icon: SlidersHorizontal,
    de: { title: 'Entdecken & Filter', desc: 'Suche nach Stadt, Geschlecht, Suchart, Alter und Online-Status — auf Datenbankebene gefiltert.' },
    en: { title: 'Discover & Filter', desc: 'Search by city, gender, intent, age, and online status — all DB-level filtering.' },
  },
  {
    icon: Bell,
    de: { title: 'Benachrichtigungen', desc: 'In-App-Benachrichtigungen für Nachrichten, Matches, Anfragen und Systemereignisse.' },
    en: { title: 'Notifications', desc: 'In-app notifications for messages, matches, requests, and system events.' },
  },
  {
    icon: Shield,
    de: { title: 'Moderation', desc: 'Meldesystem mit Strikes, Bans und Admin-Werkzeugen für aktive Plattformmoderation.' },
    en: { title: 'Moderation', desc: 'Reporting system with strikes, bans, and admin tools for active platform moderation.' },
  },
  {
    icon: Lock,
    de: { title: 'DSGVO-konform', desc: 'AGB-Consent, Art.9-Einwilligung (AES-256), Soft-Delete, Pseudonymisierung, Art.15-Datenexport.' },
    en: { title: 'GDPR-Compliant', desc: 'Terms consent, Art.9 consent (AES-256), soft-delete, pseudonymisation, Art.15 data export.' },
  },
  {
    icon: ShieldAlert,
    de: { title: 'Schutz vulnerabler Nutzer', desc: 'vulnerable_flag und enhanced_protection — betroffene Profile werden automatisch aus der Suche ausgeblendet.' },
    en: { title: 'Vulnerable User Protection', desc: 'vulnerable_flag and enhanced_protection — affected profiles are automatically hidden from search.' },
  },
  {
    icon: CreditCard,
    de: { title: 'Stripe-Subscriptions', desc: 'Zahlungsabwicklung, Webhook-Integration, Zahlungshistorie und Rechnungen.' },
    en: { title: 'Stripe Subscriptions', desc: 'Payment processing, webhook integration, payment history, and invoices.' },
  },
  {
    icon: Accessibility,
    de: { title: 'Barrierefreies Design', desc: 'Dark/Light Mode, Schriftgrößen, Hoher Kontrast, Einfache Sprache — WCAG-orientiert.' },
    en: { title: 'Accessible Design', desc: 'Dark/Light mode, font sizes, high contrast, plain language — WCAG-oriented.' },
  },
]

const TIERS: TierDef[] = [
  {
    key: 'core',
    icon: Layers,
    de: {
      title: 'Core',
      desc: 'Alles für den Produktivstart',
      items: [
        'Authentifizierung & Session-Management',
        'Profil-System mit Foto-Upload',
        'Echtzeit-Chat & Kontaktanfragen',
        'Moderations- & Meldesystem',
        'Stripe-Subscriptions',
        'Benachrichtigungs-System',
      ],
    },
    en: {
      title: 'Core',
      desc: 'Everything to launch in production',
      items: [
        'Authentication & session management',
        'Profile system with photo upload',
        'Real-time chat & contact requests',
        'Moderation & reporting system',
        'Stripe subscriptions',
        'Notification system',
      ],
    },
  },
  {
    key: 'connect',
    icon: Zap,
    de: {
      title: 'Connect',
      desc: 'Erweiterte Vernetzung',
      badge: 'Beliebt',
      items: [
        'Alles aus Core',
        'Push-Benachrichtigungen',
        'Gruppen-Chat',
        'Caretaker-System',
        'Organisations-Verwaltung',
        'Medien im Chat (Fotos, Dateien)',
      ],
    },
    en: {
      title: 'Connect',
      desc: 'Extended networking',
      badge: 'Popular',
      items: [
        'Everything in Core',
        'Push notifications',
        'Group chat',
        'Caretaker system',
        'Organization management',
        'Media in chat (photos, files)',
      ],
    },
  },
  {
    key: 'premium',
    icon: Star,
    de: {
      title: 'Premium',
      desc: 'Vollausstattung',
      items: [
        'Alles aus Connect',
        'Video-Chat (WebRTC)',
        'Matching-Algorithmus',
        'Keyword-Moderation',
        'Bewertungs- & Rating-System',
        'Rechnungsgenerierung',
      ],
    },
    en: {
      title: 'Premium',
      desc: 'The full suite',
      items: [
        'Everything in Connect',
        'Video chat (WebRTC)',
        'Matching algorithm',
        'Keyword moderation',
        'Ratings & review system',
        'Invoice generation',
      ],
    },
  },
]

const CONTACT: ContactDef[] = [
  { icon: MessageSquare, label: 'WhatsApp', value: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP_LABEL ?? '', href: process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? '' },
  { icon: AtSign,        label: 'Instagram', value: process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM_LABEL ?? '', href: process.env.NEXT_PUBLIC_CONTACT_INSTAGRAM ?? '' },
  { icon: Mail,          label: 'E-Mail',    value: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? '', href: `mailto:${process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? ''}` },
  { icon: Phone,         label: 'Telefon',   value: process.env.NEXT_PUBLIC_CONTACT_PHONE_LABEL ?? '', href: process.env.NEXT_PUBLIC_CONTACT_PHONE_TEL ?? '' },
]

const TIER_CARD_CLASS: Record<TierKey, string> = {
  core: 'border-outline-variant    bg-surface-container-low',
  connect: 'border-primary-fixed-dim bg-surface-container',
  premium: 'border-tertiary-fixed-dim bg-surface-container-low',
}

const TIER_ICON_CLASS: Record<TierKey, string> = {
  core: 'text-on-surface-variant',
  connect: 'text-primary-fixed-dim',
  premium: 'text-tertiary-fixed-dim',
}

// ─── Copy ─────────────────────────────────────────────────────────────────────

const CONTENT = {
  de: {
    langToggle: 'EN',
    hero: {
      badge: 'Ihre Plattform. Ihre Community.',
      line1: 'Die barrierefreie Dating-Plattform.',
      line2: 'White-Label für Ihre Organisation.',
      subtitle:
        'XXX ist eine lizenzierbare SaaS-Lösung für Organisationen, die eine eigene soziale Kontaktplattform betreiben möchten — DSGVO-konform, zugänglich und sicher für vulnerable Nutzergruppen.',
      cta: 'Jetzt anfragen',
    },
    features: {
      heading: 'Vollständig ausgestattet',
      sub: 'Alle Module sind produktionsreif und werden aktiv weiterentwickelt.',
    },
    tiers: {
      heading: 'Lizenzmodelle',
      sub: 'Wählen Sie das passende Paket für Ihre Organisation.',
      cta: 'Angebot anfragen',
    },
    contact: {
      heading: 'Kontakt aufnehmen',
      sub: 'Wir stehen Ihnen für Demos, Angebote und technische Fragen zur Verfügung.',
    },
    tech: {
      toggle: 'Technische Details',
      heading: 'Für Entscheider mit technischem Hintergrund',
      rows: [
        { label: 'Architektur', value: 'NestJS Backend · Next.js 16 · PostgreSQL 16 + PostGIS · TypeORM' },
        { label: 'Sicherheit', value: 'AES-256-CBC · bcrypt · JWT + HttpOnly Refresh Token · SHA-256+Salt E-Mail-Hashing' },
        { label: 'Deployment', value: 'Railway-ready · Docker · 1 Backend — separate DB pro Kunde möglich' },
        { label: 'APIs', value: 'REST + WebSocket (Socket.io) · Stripe Webhooks' },
        { label: 'DSGVO-Infrastruktur', value: 'pseudonymize_user() · 30-Tage Cronjob · consent_logs · Art.15 Export Endpoint' },
        { label: 'Lizenzierung', value: 'Core / Connect / Premium — Module per Lizenzschlüssel aktiviert' },
      ],
    },
    footer: '© 2025 XXX · Barrierefreie soziale Plattformen für Organisationen',
  },
  en: {
    langToggle: 'DE',
    hero: {
      badge: 'Your Platform. Your Community.',
      line1: 'The Accessible Dating Platform.',
      line2: 'White-Label for Your Organization.',
      subtitle:
        'XXX is a licensable SaaS solution for organizations looking to operate their own social connection platform — GDPR-compliant, accessible, and safe for vulnerable user groups.',
      cta: 'Request a demo',
    },
    features: {
      heading: 'Fully equipped',
      sub: 'All modules are production-ready and actively maintained.',
    },
    tiers: {
      heading: 'License Tiers',
      sub: 'Choose the right package for your organization.',
      cta: 'Request a quote',
    },
    contact: {
      heading: 'Get in touch',
      sub: "We're available for demos, quotes, and technical inquiries.",
    },
    tech: {
      toggle: 'Technical Details',
      heading: 'For decision-makers with a technical background',
      rows: [
        { label: 'Architecture', value: 'NestJS backend · Next.js 16 · PostgreSQL 16 + PostGIS · TypeORM' },
        { label: 'Security', value: 'AES-256-CBC field encryption · bcrypt · JWT + HttpOnly refresh token · SHA-256+salt email hashing' },
        { label: 'Deployment', value: 'Railway-ready · Docker · single backend — separate DB per client possible' },
        { label: 'APIs', value: 'REST + WebSocket (Socket.io) · Stripe webhooks' },
        { label: 'GDPR infrastructure', value: 'pseudonymize_user() DB function · 30-day cronjob · consent_logs · Art.15 export endpoint' },
        { label: 'Licensing', value: 'Core / Connect / Premium — modules activated via license key' },
      ],
    },
    footer: '© 2025 XXX · Accessible social platforms for organizations',
  },
} as const

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function B2BPage() {
  const [lang, setLang] = useState<Lang>('de')
  const [techOpen, setTechOpen] = useState(false)
  const t = CONTENT[lang]
  const { theme, toggleTheme } = useThemeStore()

  return (
    <div className="min-h-screen bg-background text-on-surface">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-surface-container-low/80 backdrop-blur-md border-b border-outline-variant">
        <div className="mx-auto flex h-16 max-w-screen-lg items-center justify-between px-6">
          <span className="text-xl font-bold tracking-tight text-on-surface">XXX</span>
          <div className="flex items-center gap-2">
            <a
              href="#contact"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-primary-fixed-dim text-on-primary-container text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              {t.hero.cta}
            </a>
            <button
              onClick={() => setLang(lang === 'de' ? 'en' : 'de')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-sm font-medium transition-colors"
            >
              <Globe size={14} aria-hidden />
              {t.langToggle}
            </button>
            <button
              aria-label={theme === 'dark' ? 'Zum hellen Design wechseln' : 'Zum dunklen Design wechseln'}
              onClick={toggleTheme}
              className="p-2 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              {theme === 'dark' ? <Sun size={18} aria-hidden /> : <Moon size={18} aria-hidden />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-screen-lg px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-4 py-1.5 text-xs font-medium text-on-surface-variant mb-8">
          <Building2 size={12} aria-hidden />
          {t.hero.badge}
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
          {t.hero.line1}
          <br />
          <span className="text-primary-fixed-dim">{t.hero.line2}</span>
        </h1>

        <p className="mt-6 mx-auto max-w-2xl text-base sm:text-lg text-on-surface-variant leading-relaxed">
          {t.hero.subtitle}
        </p>

        <div className="mt-10">
          <a
            href="#contact"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-primary-fixed-dim text-on-primary-container font-semibold text-sm hover:opacity-90 active:scale-95 transition-all"
          >
            {t.hero.cta}
            <ArrowRight size={16} aria-hidden />
          </a>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-screen-lg px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">{t.features.heading}</h2>
          <p className="mt-3 text-on-surface-variant max-w-xl mx-auto">{t.features.sub}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, de, en }) => {
            const f = lang === 'de' ? de : en
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-outline-variant bg-surface-container-low p-5 hover:bg-surface-container transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-surface-container">
                    <Icon size={18} className="text-primary-fixed-dim" aria-hidden />
                  </div>
                  <h3 className="text-sm font-semibold text-on-surface">{f.title}</h3>
                </div>
                <p className="text-xs text-on-surface-variant leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Tiers ────────────────────────────────────────────────────── */}
      <section className="bg-surface-container-lowest py-20">
        <div className="mx-auto max-w-screen-lg px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">{t.tiers.heading}</h2>
            <p className="mt-3 text-on-surface-variant max-w-xl mx-auto">{t.tiers.sub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {TIERS.map(({ key, icon: Icon, de, en }) => {
              const tier = lang === 'de' ? de : en
              return (
                <div
                  key={key}
                  className={`relative rounded-2xl border-2 p-6 flex flex-col ${TIER_CARD_CLASS[key]}`}
                >
                  {tier.badge && (
                    <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary-fixed-dim text-on-primary-container text-xs font-bold px-3 py-1 whitespace-nowrap">
                      {tier.badge}
                    </span>
                  )}

                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-container mb-4">
                    <Icon size={20} className={TIER_ICON_CLASS[key]} aria-hidden />
                  </div>

                  <h3 className="text-lg font-bold text-on-surface">{tier.title}</h3>
                  <p className="text-sm text-on-surface-variant mt-1 mb-6">{tier.desc}</p>

                  <ul className="space-y-3 flex-1">
                    {tier.items.map((item) => {
                      const isIncludes =
                        item.startsWith('Alles aus') || item.startsWith('Everything in')
                      return (
                        <li key={item} className="flex items-start gap-2.5 text-sm">
                          <Check
                            size={14}
                            className="text-primary-fixed-dim flex-shrink-0 mt-0.5"
                            aria-hidden
                          />
                          <span
                            className={
                              isIncludes
                                ? 'text-on-surface font-medium'
                                : 'text-on-surface-variant'
                            }
                          >
                            {item}
                          </span>
                        </li>
                      )
                    })}
                  </ul>

                  <a
                    href="#contact"
                    className={`mt-7 block w-full text-center py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 active:scale-95 ${key === 'connect'
                        ? 'bg-primary-fixed-dim text-on-primary-container'
                        : 'border border-outline-variant text-on-surface hover:bg-surface-container-high'
                      }`}
                  >
                    {t.tiers.cta}
                  </a>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Contact ──────────────────────────────────────────────────── */}
      <section id="contact" className="mx-auto max-w-screen-lg px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-on-surface">{t.contact.heading}</h2>
          <p className="mt-3 text-on-surface-variant max-w-xl mx-auto">{t.contact.sub}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CONTACT.map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group flex flex-col items-center gap-3 rounded-2xl border border-outline-variant bg-surface-container-low p-6 text-center hover:border-primary-fixed-dim hover:bg-surface-container transition-all"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-container group-hover:bg-surface-container-high transition-colors">
                <Icon size={20} className="text-primary-fixed-dim" aria-hidden />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  {label}
                </p>
                <p className="mt-1 text-sm font-medium text-on-surface">{value}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ── Technical Details ────────────────────────────────────────── */}
      <section className="mx-auto max-w-screen-lg px-6 pb-16">
        <div className="rounded-2xl border border-outline-variant bg-surface-container-low overflow-hidden">

          <button
            onClick={() => setTechOpen((v) => !v)}
            aria-expanded={techOpen}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-surface-container transition-colors"
          >
            <span className="text-sm font-semibold text-on-surface">{t.tech.toggle}</span>
            <ChevronDown
              size={18}
              aria-hidden
              className={`text-on-surface-variant flex-shrink-0 transition-transform duration-200 ${techOpen ? 'rotate-180' : ''
                }`}
            />
          </button>

          {techOpen && (
            <div className="border-t border-outline-variant px-6 py-6">
              <h3 className="text-sm font-semibold text-on-surface mb-5">{t.tech.heading}</h3>
              <dl className="space-y-4">
                {t.tech.rows.map(({ label, value }) => (
                  <div
                    key={label}
                    className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-1 sm:gap-6 sm:items-baseline"
                  >
                    <dt className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                      {label}
                    </dt>
                    <dd className="font-mono text-xs text-on-surface leading-relaxed">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}


    </div>
  )
}
