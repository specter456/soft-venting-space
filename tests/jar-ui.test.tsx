/**
 * Jar screen UI — tuck 3 notes, open the jar, shake out a slip, ask for
 * another, then see all papers.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { setScopedSpaceId } from "../src/lib/safe-storage";
import { saveJar, type JarNote } from "../src/lib/jar";
import { GratitudeJarScreen } from "../src/components/GratitudeJar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOTES: JarNote[] = [
  { id: "n1", text: "the sun came out", date: "Nov 18" },
  { id: "n2", text: "a friend remembered me", date: "Nov 19" },
  { id: "n3", text: "tea was perfect", date: "Nov 20" },
];

let root: Root | null = null;
let container: HTMLElement;

const text = () => container.textContent ?? "";
const click = (label: string) => {
  const hit = [...container.querySelectorAll("button")].find((b) =>
    (b.textContent ?? "").includes(label),
  );
  if (!hit) throw new Error(`button "${label}" not found in: ${text().slice(0, 200)}`);
  act(() => { hit.click(); });
};

beforeEach(() => {
  localStorage.clear();
  setScopedSpaceId("spaceA");
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(async () => {
  const r = root;
  root = null;
  if (r) await act(async () => r.unmount());
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("gratitude jar screen", () => {
  it("shows the empty line for a fresh jar", async () => {
    root = createRoot(container);
    await act(async () => root!.render(<GratitudeJarScreen />));
    expect(text()).toContain("the jar is waiting for its first good thing 🫙");
    expect([...container.querySelectorAll("button")].some((b) => (b.textContent ?? "").includes("open the jar"))).toBe(false);
  });

  it("opens with a shake, slides out a slip, offers another, lists all papers", async () => {
    saveJar(NOTES);
    root = createRoot(container);
    await act(async () => root!.render(<GratitudeJarScreen />));
    expect(text()).toContain("3 tiny good things inside");

    click("open the jar");
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    const first = NOTES.find((n) => text().includes(n.text));
    expect(first, "a slip with its text should have slid out").toBeTruthy();
    expect(text()).toContain(first!.date);
    expect(text()).toContain("put it back");
    expect(text()).toContain("another slip");

    click("another slip");
    await act(async () => { await new Promise((r) => setTimeout(r, 700)); });
    const second = NOTES.find((n) => text().includes(n.text));
    expect(second, "another slip should show").toBeTruthy();
    expect(second!.text).not.toBe(first!.text);

    click("see all papers");
    expect(text().match(/Nov 1[89]|Nov 20/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    for (const n of NOTES) expect(text()).toContain(n.text);

    click("close");
    expect(text()).not.toContain("all your papers");
  });
});
