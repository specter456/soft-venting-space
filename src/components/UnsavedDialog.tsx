/**
 * Soft unsaved-work dialog — shown when the user tries to leave
 * a creation screen with unsaved changes.
 */
export function UnsavedDialog({ onSave, onLeave }: { onSave: () => void; onLeave: () => void }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/20 px-5">
      <div className="clay-card relative w-full max-w-sm overflow-hidden px-6 py-8 text-center">
        <div aria-hidden className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-lavender-100/70 blur-2xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-blush-100/60 blur-2xl" />

        <span className="text-3xl" aria-hidden>💭</span>
        <h2 className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
          leave without saving?
        </h2>
        <p className="mt-2 text-sm text-ink-soft">
          your little creation isn&apos;t saved yet.
        </p>

        <div className="mt-6 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onSave}
            className="clay-btn w-full rounded-2xl px-5 py-3 text-sm font-bold text-white"
          >
            save &amp; leave
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="clay-btn-soft w-full rounded-2xl px-5 py-3 text-sm font-bold text-ink-deep"
          >
            leave without saving
          </button>
        </div>
      </div>
    </div>
  );
}
