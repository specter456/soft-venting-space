/**
 * Unsaved-work guard contract — the "save before you go?" yes/no dialog.
 *
 * Verifies the mission's contract:
 *   - not dirty → back leaves immediately, no dialog;
 *   - dirty → the dialog appears with the exact title/line/two buttons;
 *   - "yes, save it 💜" runs the screen's save and then leaves;
 *   - "no, don't save" skips the save and then leaves;
 *   - every listed creation/edit screen registers with useUnsavedWork;
 *   - the old "save & leave / leave without saving" wording is gone from src.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { UnsavedDialog } from "@/components/UnsavedDialog";
import { useUnsavedGuard, useUnsavedWork } from "@/lib/useUnsavedGuard";

// Let React's act() flush work properly in this happy-dom environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/* ─── Harness: one screen + the Dashboard-style guard around it ─── */

function Harness({
  dirty,
  onBack,
  onSave,
}: {
  dirty: boolean;
  onBack: () => void;
  onSave: () => boolean;
}) {
  const guard = useUnsavedGuard(onBack);
  useUnsavedWork({ dirty, onSave });
  return (
    <div>
      <span id="state">{guard.showGuard ? "dialog" : "clean"}</span>
      <button type="button" onClick={guard.handleBack}>
        go back
      </button>
      {guard.showGuard && <UnsavedDialog onSave={guard.handleSave} onLeave={guard.handleLeave} />}
    </div>
  );
}

let root: Root | null = null;

function renderHarness(props: { dirty: boolean; onBack: () => void; onSave: () => boolean }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root!.render(
      <MemoryRouter>
        <Harness {...props} />
      </MemoryRouter>,
    );
  });
  return container;
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
  const hit = [...container.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!hit) {
    const all = [...container.querySelectorAll("button")].map((b) => b.textContent);
    throw new Error(`button "${label}" not found; present: ${JSON.stringify(all)}`);
  }
  return hit as HTMLButtonElement;
}

function stateOf(container: HTMLElement): string {
  return container.querySelector("#state")?.textContent ?? "missing";
}

afterEach(async () => {
  const r = root;
  root = null;
  if (r) await act(async () => r.unmount());
  document.body.innerHTML = "";
});

/* ─── Behaviour ─────────────────────────────────────────────────── */

describe("unsaved-work guard", () => {
  it("leaves instantly with no dialog when nothing is dirty", async () => {
    const onBack = vi.fn();
    const onSave = vi.fn(() => true);
    const container = renderHarness({ dirty: false, onBack, onSave });

    await act(async () => {
      button(container, "go back").click();
    });

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    expect(stateOf(container)).toBe("clean");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it("asks with the exact yes/no dialog when dirty; yes saves, then leaves", async () => {
    const onBack = vi.fn();
    const onSave = vi.fn(() => true);
    const container = renderHarness({ dirty: true, onBack, onSave });

    await act(async () => {
      button(container, "go back").click();
    });

    // Dialog appears with the exact copy…
    expect(stateOf(container)).toBe("dialog");
    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.querySelector("h2")?.textContent).toBe("save before you go?");
    expect(dialog!.querySelector("p")?.textContent).toBe(
      "your changes aren't saved yet — do you want to save them?",
    );
    expect(onBack).not.toHaveBeenCalled(); // still on the screen

    // …"yes, save it 💜" saves, then leaves.
    await act(async () => {
      button(container, "yes, save it 💜").click();
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(stateOf(container)).toBe("clean");
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('"no, don\'t save" skips the save, then leaves', async () => {
    const onBack = vi.fn();
    const onSave = vi.fn(() => true);
    const container = renderHarness({ dirty: true, onBack, onSave });

    await act(async () => {
      button(container, "go back").click();
    });
    await act(async () => {
      button(container, "no, don't save").click();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(stateOf(container)).toBe("clean");
  });
});

/* ─── Every listed screen is wired ──────────────────────────────── */

describe("every listed creation/edit screen registers the guard", () => {
  const read = (p: string) => readFileSync(path.resolve(process.cwd(), p), "utf8");

  const GUARDED_SCREENS: [string, string][] = [
    ["Recording", "src/pages/app/RecordScreen.tsx"],
    ["Scribble", "src/pages/app/ScribbleScreen.tsx"],
    ["Photo Doodle", "src/pages/app/CreateScreen.tsx"],
    ["Stickers creator", "src/pages/app/StickerStudio.tsx"],
    ["GIF Studio", "src/pages/app/GifStudio.tsx"],
    ["Notes editor", "src/pages/app/NoteEditor.tsx"],
    ["Diary editor", "src/pages/app/DiaryScreen.tsx"],
    ["Polaroid Wall", "src/components/PolaroidWall.tsx"],
    ["Calendar customize", "src/pages/app/CalendarScreen.tsx"],
    ["Game Creator builder", "src/pages/app/GamesScreen.tsx"],
    ["future-note composer", "src/components/FutureNoteSection.tsx"],
  ];

  for (const [name, file] of GUARDED_SCREENS) {
    it(`${name} wires useUnsavedWork (${file})`, () => {
      expect(read(file)).toContain("useUnsavedWork(");
    });
  }

  it("Dashboard intercepts back + taskbar and renders the dialog", () => {
    const dash = read("src/pages/Dashboard.tsx");
    expect(dash).toContain("useUnsavedGuard(");
    expect(dash).toContain("<UnsavedDialog");
    expect(dash).toContain("handleBack");
    expect(dash).toContain("requestLeave");
  });

  it('the old "save & leave / leave without saving" wording is gone from src', () => {
    const srcRoot = path.resolve(process.cwd(), "src");
    const files = readdirSync(srcRoot, { recursive: true }) as string[];
    for (const rel of files) {
      if (!/\.(ts|tsx)$/.test(rel)) continue;
      const text = readFileSync(path.join(srcRoot, rel), "utf8");
      expect(text, `${rel} still contains old guard wording`).not.toMatch(
        /save & leave|leave without saving/,
      );
    }
  });
});
