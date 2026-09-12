import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useTable, type MoodCheckin, type VaultItem, type KVPair } from "@/lib/db";
import { scopedGetItem } from "@/lib/safe-storage";
import { cn } from "@/lib/utils";

type MilestoneId =
  | "first-steps"
  | "first-doodle"
  | "first-frame"
  | "seven-sunny"
  | "jar-keeper"
  | "storyteller"
  | "night-owl"
  | "collector";

interface MilestoneDef {
  id: MilestoneId;
  emoji: string;
  label: string;
  hint: string;
}

const MILESTONES: MilestoneDef[] = [
  { id: "first-steps", emoji: "🌱", label: "first steps", hint: "your first check-in" },
  { id: "first-doodle", emoji: "🎨", label: "first doodle", hint: "a scribble saved" },
  { id: "first-frame", emoji: "🎞️", label: "first frame", hint: "a GIF saved" },
  { id: "seven-sunny", emoji: "☀️", label: "seven sunny days", hint: "7 happy check-ins" },
  { id: "jar-keeper", emoji: "🫙", label: "jar keeper", hint: "10 gratitude notes" },
  { id: "storyteller", emoji: "📖", label: "storyteller", hint: "finished a tale" },
  { id: "night-owl", emoji: "🦉", label: "night owl", hint: "used wind-down" },
  { id: "collector", emoji: "📸", label: "collector", hint: "10 items in vault" },
];

function getEarnedMilestones(
  checkins: MoodCheckin[],
  vaultItems: VaultItem[],
  kv: KVPair[],
): Set<MilestoneId> {
  const earned = new Set<MilestoneId>();

  // first-steps: any check-in
  if (checkins.length > 0) earned.add("first-steps");

  // seven-sunny: 7 happy check-ins
  const happyCount = checkins.filter((c) => c.mood === "happy").length;
  if (happyCount >= 7) earned.add("seven-sunny");

  // collector: 10 vault items
  if (vaultItems.length >= 10) earned.add("collector");

  // first-doodle: any doodle saved
  const doodleJson = kv.find((k) => k.key === "venting-scribbles")?.value;
  if (doodleJson) {
    try {
      const doodles = JSON.parse(doodleJson);
      if (Array.isArray(doodles) && doodles.length > 0) earned.add("first-doodle");
    } catch { /* ignore */ }
  }

  // first-frame: any GIF saved
  const gifJson = kv.find((k) => k.key === "venting-gifs")?.value;
  if (gifJson) {
    try {
      const gifs = JSON.parse(gifJson);
      if (Array.isArray(gifs) && gifs.length > 0) earned.add("first-frame");
    } catch { /* ignore */ }
  }

  // jar-keeper: 10 gratitude notes
  const jarJson = kv.find((k) => k.key === "venting-gratitude-jar")?.value;
  if (jarJson) {
    try {
      const notes = JSON.parse(jarJson);
      if (Array.isArray(notes) && notes.length >= 10) earned.add("jar-keeper");
    } catch { /* ignore */ }
  }

  // storyteller: finished a tale (flag set by TinyTales via localStorage)
  if (scopedGetItem("venting-milestone-storyteller") === "true") earned.add("storyteller");
  // Also check the older KV-based flag for backward compat
  if (!earned.has("storyteller")) {
    const talesJson = kv.find((k) => k.key === "venting-tales-completed")?.value;
    if (talesJson) {
      try {
        const tales = JSON.parse(talesJson);
        if (Array.isArray(tales) && tales.length > 0) earned.add("storyteller");
      } catch { /* ignore */ }
    }
  }

  // night-owl: used wind-down
  const windDown = scopedGetItem("venting-wind-down-used");
  if (windDown === "true") earned.add("night-owl");

  // Also check for first-doodle via vault items (doodles saved to vault)
  if (!earned.has("first-doodle")) {
    const doodleItems = vaultItems.filter((v) => v.kind === "doodle");
    if (doodleItems.length > 0) earned.add("first-doodle");
  }

  // Check for first-frame via vault items (GIFs saved to vault)
  if (!earned.has("first-frame")) {
    const gifItems = vaultItems.filter((v) => v.kind === "gif");
    if (gifItems.length > 0) earned.add("first-frame");
  }

  return earned;
}

/** Renders the soft milestones section — place in Settings */
export default function SoftMilestones() {
  const checkins = useTable<MoodCheckin>("moodCheckins");
  const vaultItems = useTable<VaultItem>("vaultItems");
  const kv = useTable<KVPair>("kv");
  const [prevEarned, setPrevEarned] = useState<Set<MilestoneId>>(new Set());
  const initRef = useRef(true);

  const earned = getEarnedMilestones(checkins, vaultItems, kv);

  // Show toast only when a NEW milestone is earned (not on mount)
  useEffect(() => {
    if (initRef.current) {
      initRef.current = false;
      setPrevEarned(new Set(earned));
      return;
    }
    for (const id of earned) {
      if (!prevEarned.has(id)) {
        toast("you grew a little milestone 🌱", {
          description: MILESTONES.find((m) => m.id === id)?.label,
        });
        break; // one toast at a time
      }
    }
    setPrevEarned(new Set(earned));
  }, [earned]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="grid grid-cols-2 gap-2">
      {MILESTONES.map((m) => {
        const isEarned = earned.has(m.id);
        return (
          <div
            key={m.id}
            className={cn(
              "flex flex-col items-center gap-1 rounded-2xl px-3 py-3 text-center transition-transform",
              isEarned
                ? "bg-mint-100/60 shadow-[0_0_12px_-4px_rgba(134,200,160,0.5)]"
                : "bg-lavender-50/40 opacity-50",
            )}
          >
            <span className={cn("text-2xl", !isEarned && "grayscale opacity-60")}>
              {m.emoji}
            </span>
            <span className={cn("text-[11px] font-bold", isEarned ? "text-ink-deep" : "text-ink-soft")}>
              {m.label}
            </span>
            <span className="text-[9px] font-medium text-ink-soft leading-tight">
              {isEarned ? m.hint : "not yet — no rush"}
            </span>
          </div>
        );
      })}
    </div>
  );
}
