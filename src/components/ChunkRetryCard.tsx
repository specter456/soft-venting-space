import type { ReactElement } from "react";

/** Gentle retry card shown only after a reload already failed to fix it. */
export function ChunkRetryCard(): ReactElement {
  return (
    <div className="clay-card mx-auto w-full max-w-sm px-6 py-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-lavender-100 text-2xl">
        💜
      </div>
      <h2 className="mt-3 text-lg font-bold tracking-tight text-ink-deep">
        this screen didn't finish loading.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Don't worry — your feelings are all still safe on this device.
        Give it one more gentle try.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="clay-btn mt-5 px-5 py-2.5 text-sm font-bold text-ink-deep"
      >
        try again
      </button>
    </div>
  );
}
