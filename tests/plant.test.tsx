/**
 * Three plant fixes (regression tests):
 *
 *  1. ONE GRAPHIC — the plant + smiley pot are a single <svg> at every
 *     growth stage, with the stem/seed base starting INSIDE the pot opening
 *     (bottom y overlaps the pot's top edge → zero gap, never separable).
 *  2. THE PLANT IS NOT A GAME — it has its own /dashboard/plant route with
 *     its own header title, and Games contains no plant card/route/leftover.
 *  3. HOME CARD — the Home card renders a mini version of the SAME svg unit,
 *     links to the plant screen, and says "1 day" (never "1 days").
 *
 * Geometry is asserted from the rendered svg attributes; the route/header
 * wiring is asserted against the source files that own it.
 */
import { describe, it, expect, beforeAll, afterEach } from "vitest";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import fs from "node:fs";
import path from "node:path";
import { PlantUnit, PlantHomeCard } from "@/components/MyLittlePlant";
import {
  SEED_PALETTES,
  plantCardLine,
  plantCardStatus,
  plantDateKey,
  type PlantState,
} from "@/lib/my-plant";
import { setScopedSpaceId } from "@/lib/safe-storage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// vitest runs from the project root — read the source files that own the wiring
const src = (p: string) => fs.readFileSync(path.join(process.cwd(), "src", p), "utf8");

/** Every stage band: seed 0, sprout 1-2, stem 3-6, bud 7-13,
 *  half bloom 14-27, full glow 28+. */
const STAGES = [0, 1, 2, 3, 6, 7, 13, 14, 27, 28, 100];

let container: HTMLElement;
let root: Root;

beforeAll(() => {
  document.body.innerHTML = `<div id="plant-root"></div>`;
  container = document.getElementById("plant-root") as HTMLElement;
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  localStorage.removeItem("venting-streak-plant");
  container.innerHTML = "";
  root = createRoot(container);
});

/** Vertical span of a simple svg shape, in viewBox user units. */
function vBox(el: Element): { top: number; bottom: number } {
  const tag = el.tagName.toLowerCase();
  if (tag === "rect") {
    const y = Number(el.getAttribute("y"));
    return { top: y, bottom: y + Number(el.getAttribute("height")) };
  }
  if (tag === "ellipse" || tag === "circle") {
    const cy = Number(el.getAttribute("cy"));
    const r = Number(el.getAttribute("ry") ?? el.getAttribute("r"));
    return { top: cy - r, bottom: cy + r };
  }
  throw new Error(`unexpected shape in plant unit: ${tag}`);
}

describe("one svg — plant and pot can never separate", () => {
  for (const stage of STAGES) {
    it(`stage ${stage}: exactly ONE svg, stem rooted inside the pot`, async () => {
      await act(async () => {
        root.render(<PlantUnit stage={stage} pal={SEED_PALETTES.wisteria} />);
      });

      const svgs = container.querySelectorAll("svg");
      expect(svgs.length, `stage ${stage} must render exactly one svg`).toBe(1);
      const unit = svgs[0];
      expect(unit.getAttribute("data-stage")).toBe(String(stage));

      // pot AND growth live inside that same single svg
      const rim = container.querySelector('[data-part="pot-rim"]');
      expect(rim, "the pot rim is drawn").toBeTruthy();
      expect(rim!.closest("svg")).toBe(unit);

      // every part of the unit belongs to the one svg — no separate pot div
      for (const part of container.querySelectorAll("[data-part]")) {
        expect(part.closest("svg"), `part ${part.getAttribute("data-part")} must be in the unit svg`).toBe(unit);
      }
      // the old div-based pot (clip-path trapezoid) is gone
      expect(container.querySelector('[style*="clip-path"]')).toBeNull();

      // the growth crosses the pot's top edge: starts above it and ends
      // INSIDE the pot (bottom overlaps by a real margin → zero gap)
      const growth =
        container.querySelector('[data-part="stem"]') ??
        container
          .querySelector('[data-part="seed-mound"]')
          ?.querySelector("ellipse");
      expect(growth, `stage ${stage} draws a stem or seed mound`).toBeTruthy();
      const potTop = vBox(rim!).top;
      const box = vBox(growth!);
      expect(box.top, "growth starts above the pot rim").toBeLessThan(potTop);
      expect(box.bottom, "growth continues inside the pot opening").toBeGreaterThanOrEqual(potTop + 6);
    });
  }

  it("the card's mini plant is the same single-svg unit", async () => {
    seedPlant(1, "");
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <PlantHomeCard />
        </MemoryRouter>,
      );
    });
    const card = container.querySelector("a")!;
    expect(card.querySelectorAll("svg").length, "mini plant = one svg").toBe(1);
    expect(card.querySelector('[data-part="pot-rim"]')).toBeTruthy();
    expect(card.querySelector('[data-part="stem"]')).toBeTruthy();
  });
});

describe("the plant screen has its own route and header", () => {
  it("main.tsx mounts it at /dashboard/plant", () => {
    expect(src("main.tsx")).toContain('path="plant"');
    expect(src("main.tsx")).toContain("<PlantScreen />");
  });

  it("Dashboard header title is its own (back arrow + title)", () => {
    expect(src("pages/Dashboard.tsx")).toContain('"/dashboard/plant": "your little plant 🌱"');
  });

  it("Home card is the entrance — it links to the plant screen, not Games", async () => {
    seedPlant(3, "");
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <PlantHomeCard />
        </MemoryRouter>,
      );
    });
    const card = container.querySelector("a")!;
    expect(card.getAttribute("href")).toBe("/dashboard/plant");
    expect(card.textContent).not.toContain("all games");
  });
});

describe("Games = 13 games + creator only (no plant)", () => {
  it("has no plant route, card, or leftovers", () => {
    const games = src("pages/app/GamesScreen.tsx");
    expect(games).not.toContain("MyLittlePlant");
    expect(games).not.toContain("PlantRouteId");
    expect(games).not.toContain("isPlant");
    expect(games).not.toContain("route=plant");
    expect(games).not.toContain('searchParams.get("route")');
    expect(games).not.toContain("Bloom Garden");
  });

  it("keeps exactly the 13 built-in games, none of them the plant", () => {
    const match = src("pages/app/GamesScreen.tsx").match(/type BuiltInGameId = ([^;]+);/);
    expect(match, "game registry type exists").toBeTruthy();
    const ids = match![1].split("|").map((s) => s.trim().replace(/"/g, ""));
    expect(ids.length).toBe(13);
    expect(ids).not.toContain("plant");
    expect(ids).toContain("garden"); // Memory Garden stays a real game
  });
});

describe("Home card copy", () => {
  it("says “1 day”, never “1 days”, plus the stage", () => {
    expect(plantCardLine({ careDays: 1 } as PlantState)).toBe("1 day · A Tiny Seed");
    expect(plantCardLine({ careDays: 0 } as PlantState)).toBe("0 days · A Tiny Seed");
    expect(plantCardLine({ careDays: 7 } as PlantState)).toBe("7 days · A Budding Friend");
    expect(plantCardLine({ careDays: 28 } as PlantState)).toBe("28 days · A Glowing Bouquet");
    expect(plantCardLine(null)).toBe("plant a seed to begin 🌱");
  });

  it("status is needs-water / watered-today", () => {
    const today = plantDateKey(0);
    const base = { careDays: 1, dayOffset: 0, lastWateredOn: "" } as PlantState;
    expect(plantCardStatus(base)).toBe("needs water 💧");
    expect(plantCardStatus({ ...base, lastWateredOn: today })).toBe("watered today 💤");
    expect(plantCardStatus(null)).toBeNull();
  });

  it("renders those lines in the card", async () => {
    seedPlant(1, "");
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <PlantHomeCard />
        </MemoryRouter>,
      );
    });
    const text = container.querySelector("a")!.textContent ?? "";
    expect(text).toContain("your little plant 🌱");
    expect(text).toContain("1 day · A Tiny Seed");
    expect(text).not.toContain("1 days");
    expect(text).toContain("needs water 💧");
    expect(text).toContain("→");
  });

  it("flips to watered today after a watering", async () => {
    seedPlant(1, plantDateKey(0));
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={["/dashboard"]}>
          <PlantHomeCard />
        </MemoryRouter>,
      );
    });
    const text = container.querySelector("a")!.textContent ?? "";
    expect(text).toContain("watered today 💤");
    expect(text).toContain("1 day · A Tiny Seed");
  });
});

function seedPlant(careDays: number, lastWateredOn: string) {
  // plain (unscoped) key — no active space in this test
  setScopedSpaceId(null);
  const today = plantDateKey(0);
  localStorage.setItem(
    "venting-streak-plant",
    JSON.stringify({
      seed: "wisteria",
      plantedOn: today,
      careDays,
      lastWateredOn,
      milestonesHit: [],
      dayOffset: 0,
      wateredMonthDays: [],
      wateredMonth: today.slice(0, 7),
    }),
  );
}
