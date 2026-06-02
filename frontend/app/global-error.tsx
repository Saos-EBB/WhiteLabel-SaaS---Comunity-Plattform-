'use client'

import './globals.css'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="de">
      <head>
        {/* Re-apply theme class so CSS vars resolve correctly even without the root layout */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('xxx-theme');var theme=t?JSON.parse(t).state?.theme:null;document.documentElement.classList.add(theme==='light'?'light':'dark');}catch(e){document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          background: 'var(--color-background, #0b1326)',
          color: 'var(--color-on-surface, #dae2fd)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ width: '100%', maxWidth: '28rem', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
            <div
              style={{
                width: '5rem',
                height: '5rem',
                borderRadius: '1rem',
                background: 'var(--color-surface-container-high, #222a3d)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                width="40"
                height="40"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-error, #ffb4ab)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>
          </div>

          {/* Text */}
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '0.5rem',
              color: 'var(--color-on-surface, #dae2fd)',
            }}
          >
            Kritischer Fehler
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              lineHeight: '1.5',
              color: 'var(--color-on-surface-variant, #bdcabe)',
              marginBottom: '2rem',
            }}
          >
            Die App konnte nicht geladen werden. Bitte lade die Seite neu.
          </p>

          {/* Button */}
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.625rem 1.25rem',
              borderRadius: '9999px',
              background: 'var(--color-primary-fixed-dim, #73db9a)',
              color: 'var(--color-on-primary-container, #006d3e)',
              fontWeight: 600,
              fontSize: '0.875rem',
              minHeight: '2.75rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'opacity 150ms ease',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.85' }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
          >
            Seite neu laden
          </button>
        </div>
      </body>
    </html>
  )
}
