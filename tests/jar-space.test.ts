/**
 * Mission tests — per-space plant data and the openable gratitude jar.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { setScopedSpaceId } from "../src/lib/safe-storage";
import { loadPlantState, savePlantState, plantCardLine } from "../src/lib/my-plant";
import {
  JAR_EMPTY_LINE,
  jarFillPct,
  loadJar,
  newestFirst,
  randomSlip,
  saveJar,
  tuckNote,
} from "../src/lib/jar";
import type { PlantState } from "../src/lib/my-plant";

function plantWithDays(careDays: number): PlantState {
  return {
    seed: "wisteria",
    plantedOn: "2026-11-18",
    careDays,
    lastWateredOn: "2026-11-19",
    milestonesHit: [],
    dayOffset: 0,
    wateredMonthDays: [18, 19],
    wateredMonth: "2026-11",
  };
}

beforeEach(() => {
  localStorage.clear();
  setScopedSpaceId(null);
});

describe("plant data belongs to its space", () => {
  it("uses the exact scoped key venting:<spaceId>:plant", () => {
    setScopedSpaceId("spaceA");
    savePlantState(plantWithDays(2));
    expect(localStorage.getItem("venting:spaceA:plant")).not.toBeNull();
  });

  it("space A keeps its streak while space B starts at zero", () => {
    setScopedSpaceId("spaceA");
    savePlantState(plantWithDays(2));

    setScopedSpaceId("spaceB");
    expect(loadPlantState(), "brand-new space has no plant yet").toBeNull();

    setScopedSpaceId("spaceA");
    const a = loadPlantState();
    expect(a?.careDays).toBe(2);
    expect(plantCardLine(a)).toBe("2 days · A Tiny Seed");
  });

  it("migrates the old per-space streak-plant key without leaking it", () => {
    localStorage.setItem(
      "venting:spaceC:streak-plant",
      JSON.stringify(plantWithDays(2)),
    );
    setScopedSpaceId("spaceC");
    expect(loadPlantState()?.careDays).toBe(2);
    expect(localStorage.getItem("venting:spaceC:plant")).not.toBeNull();
    expect(localStorage.getItem("venting:spaceC:streak-plant")).toBeNull();

    setScopedSpaceId("spaceD");
    expect(loadPlantState()).toBeNull();
  });
});

describe("the jar can be opened", () => {
  it("tucks slips, newest last, and another space sees an empty jar", () => {
    setScopedSpaceId("spaceA");
    let notes = loadJar();
    notes = tuckNote(notes, "the sun came out");
    notes = tuckNote(notes, "a friend remembered me");
    notes = tuckNote(notes, "tea was perfect");
    saveJar(notes);

    expect(loadJar()).toHaveLength(3);
    expect(loadJar()[0].text).toBe("the sun came out");
    expect(newestFirst(loadJar())[0].text).toBe("tea was perfect");
    expect(loadJar().every((n) => n.date.length > 0)).toBe(true);

    setScopedSpaceId("spaceB");
    expect(loadJar()).toHaveLength(0);
    expect(JAR_EMPTY_LINE).toBe("the jar is waiting for its first good thing 🫙");
  });

  it("'another slip' never repeats the slip just shown", () => {
    const notes = [
      { id: "a", text: "one", date: "Nov 1" },
      { id: "b", text: "two", date: "Nov 2" },
    ];
    for (let i = 0; i < 40; i++) {
      expect(randomSlip(notes, "a")?.id).toBe("b");
    }
    expect(randomSlip([], null)).toBeNull();
  });

  it("fills visibly and ignores blank input", () => {
    expect(jarFillPct(0)).toBe(0);
    expect(jarFillPct(15)).toBe(50);
    expect(jarFillPct(99)).toBe(100);
    expect(tuckNote([], "   ")).toHaveLength(0);
  });
});
