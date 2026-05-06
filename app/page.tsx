export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold text-primary-fixed-dim">
        XXX Design System
      </h1>
      <p className="text-on-surface-variant text-lg">
        Emerald Slate Dark Theme · Plus Jakarta Sans
      </p>

      <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
        {[
          ["bg-surface-container-lowest", "surface-container-lowest"],
          ["bg-surface-container-low", "surface-container-low"],
          ["bg-surface-container", "surface-container"],
          ["bg-surface-container-high", "surface-container-high"],
          ["bg-surface-container-highest", "surface-container-highest"],
          ["bg-primary-fixed-dim", "primary-fixed-dim"],
          ["bg-primary-container", "primary-container"],
          ["bg-tertiary-fixed-dim", "tertiary-fixed-dim"],
          ["bg-error", "error"],
          ["bg-error-container", "error-container"],
        ].map(([cls, label]) => (
          <div
            key={label}
            className={`${cls} rounded-lg p-3 text-xs font-medium text-on-surface`}
          >
            {label}
          </div>
        ))}
      </div>

      <p className="text-sm text-outline mt-4">
        Barrierefreie Dating-App · Design System aktiv
      </p>
    </main>
  );
}
