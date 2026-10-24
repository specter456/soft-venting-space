/**
 * My Little Plant — streak-based daily companion.
 *
 * The plant and its smiley pot are ONE svg unit (<PlantUnit/>): the stem
 * (or seed mound) always starts INSIDE the pot opening — its bottom
 * y-coordinate sits below the pot's top edge — so plant and pot can never
 * separate. Growth stages are simply different drawings inside that same
 * svg, all rooted at the same point above the rim.
 */

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  SEED_CHOICES,
  SEED_PALETTES,
  STAGES,
  canWaterToday,
  currentMonthDaysWatered,
  daysUntilNextMilestone,
  loadPlantState,
  loadShelf,
  nextMilestone,
  plantDateKey,
  retireBloom,
  savePlantState,
  stageForDays,
  waterPlant,
  type PlantState,
  type SeedColor,
  type SeedPalette,
  type ShelfFlower,
} from "@/lib/my-plant";
import { sfxWater, sfxArpeggio } from "@/lib/sfx";
import { useTapGuard } from "@/lib/useTapGuard";
import { cn } from "@/lib/utils";

function BloomFlowerSvg({ pal, size, petalCount }: { pal: SeedPalette; size: number; petalCount?: number }) {
  const count = petalCount ?? 6;
  return (
    <svg width={size} height={size} viewBox="0 0 88 88">
      {Array.from({ length: count }, (_, i) => {
        const deg = (360 / count) * i;
        return (
          <motion.g key={deg} animate={{ rotate: [deg, deg + 6, deg] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
            <ellipse
              cx="44"
              cy="40"
              rx="7"
              ry="16"
              fill={pal.petal}
              stroke={pal.petalDeep}
              strokeWidth="1.2"
              transform={`rotate(${deg} 44 44) translate(0 -10)`}
            />
          </motion.g>
        );
      })}
      <circle cx="44" cy="44" r="10" fill={pal.center} />
      <circle cx="44" cy="44" r="4.5" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

/* ─── ONE svg: smiley pot + growth stage ───────────────────────────── */

const UNIT_W = 160;
const UNIT_H = 240;
/** The pot's top edge (rim top) — the growth always crosses it. */
const POT_TOP = 150;
/** Stem/seed base — BELOW the pot's top edge, i.e. inside the pot opening. */
const STEM_BOT = 160;

/** A flower drawn as plain svg shapes — never a nested <svg>. */
function FlowerG({ cx, cy, size, count, pal }: {
  cx: number;
  cy: number;
  size: number;
  count: number;
  pal: SeedPalette;
}) {
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const deg = (360 / count) * i;
        return (
          <g key={deg} transform={`rotate(${deg} ${cx} ${cy})`}>
            <ellipse
              cx={cx}
              cy={cy - size * 0.34}
              rx={size * 0.17}
              ry={size * 0.36}
              fill={pal.petal}
              stroke={pal.petalDeep}
              strokeWidth="1.2"
            />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={size * 0.24} fill={pal.center} />
      <circle cx={cx - size * 0.07} cy={cy - size * 0.07} r={size * 0.11} fill="rgba(255,255,255,0.55)" />
    </g>
  );
}

/**
 * The whole plant — smiley pot AND the current growth stage — as ONE svg.
 * Growth stages are just different drawings inside this same svg: seed
 * mound → sprout → stem+leaves → bud → half bloom → full glowing bouquet.
 * The stem base (STEM_BOT = 160) always sits below the pot's top edge
 * (POT_TOP = 150), so the plant is rooted inside the pot opening with zero
 * gap — at every stage, forever.
 */
export function PlantUnit({ stage, pal, wiggle = false, extraSip = false, className }: {
  stage: number;
  pal: SeedPalette;
  /** short celebration wiggle after a watering */
  wiggle?: boolean;
  /** 💧 burst overlay after an extra sip */
  extraSip?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  const isGlowing = stage >= 28;
  const leaves = (
    <>
      <ellipse cx="61" cy="142" rx="15" ry="7.5" fill="#7FBF87" transform="rotate(-24 61 142)" />
      <ellipse cx="99" cy="131" rx="15" ry="7.5" fill="#8FCB95" transform="rotate(24 99 131)" />
    </>
  );

  return (
    <span className="relative flex flex-col items-center" data-testid="plant-unit-wrap">
      <svg
        data-testid="plant-unit"
        data-stage={stage}
        width={UNIT_W}
        height={UNIT_H}
        viewBox={`0 0 ${UNIT_W} ${UNIT_H}`}
        className={className}
        aria-hidden
      >
        <defs>
          <linearGradient id={`pot-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8A87C" />
            <stop offset="45%" stopColor="#D88A5E" />
            <stop offset="100%" stopColor="#C47A4A" />
          </linearGradient>
          <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F0C098" />
            <stop offset="100%" stopColor="#E8A87C" />
          </linearGradient>
          <linearGradient id={`soil-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6B4A2E" />
            <stop offset="100%" stopColor="#4A321E" />
          </linearGradient>
          <linearGradient id={`stem-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5E9E6C" />
            <stop offset="100%" stopColor="#3E7A4E" />
          </linearGradient>
          <radialGradient id={`glow-${uid}`}>
            <stop offset="0%" stopColor={pal.glow} />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>

        {/* ── the smiley pot (bottom) ─────────────────────────────── */}
        <g data-part="pot">
          {/* body — gentle flare, like the old clip-path pot */}
          <path d="M24,166 H136 L150,226 Q152,234 143,234 H17 Q8,234 10,226 Z" fill={`url(#pot-${uid})`} />
          {/* rim — this rect's y IS the pot's top edge */}
          <rect data-part="pot-rim" x="14" y={POT_TOP} width="132" height="16" rx="6" fill={`url(#rim-${uid})`} />
          {/* soil at the pot opening — the stem's feet are planted here */}
          <ellipse cx="80" cy="153" rx="64" ry="9" fill={`url(#soil-${uid})`} />
          {/* face */}
          <circle cx="50" cy="193" r="4" fill="#3A2010" />
          <circle cx="110" cy="193" r="4" fill="#3A2010" />
          <ellipse cx="44" cy="204" rx="6" ry="4.5" fill="#E89AA0" opacity="0.6" />
          <ellipse cx="116" cy="204" rx="6" ry="4.5" fill="#E89AA0" opacity="0.6" />
          <path d="M71,203 Q80,213 89,203" fill="none" stroke="#3A2010" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
        </g>

        {/* ── the growth stage — rooted inside the pot opening ────── */}
        <motion.g
          data-part="plant"
          style={{ transformOrigin: `80px ${STEM_BOT}px` }}
          animate={
            reduceMotion
              ? { rotate: 0 }
              : wiggle
                ? { rotate: [0, -5, 5, -3, 0] }
                : { rotate: [0, -2, 0] }
          }
          transition={
            wiggle
              ? { duration: 0.5, ease: "easeOut" }
              : { duration: 4.5, repeat: Infinity, ease: "easeInOut" }
          }
        >
          {isGlowing && <circle cx="80" cy="66" r="64" fill={`url(#glow-${uid})`} />}

          {/* stage 0 — a seed mound in the pot's opening */}
          {stage === 0 && (
            <g data-part="seed-mound">
              <ellipse cx="80" cy="152" rx="26" ry="11" fill="#7A5236" />
              <ellipse cx="80" cy="145" rx="5" ry="6.5" fill="#8A5A38" stroke="#5E3D26" strokeWidth="1.5" />
            </g>
          )}

          {/* stage 1–2 — sprout */}
          {stage >= 1 && stage < 3 && (
            <g data-part="sprout">
              <rect data-part="stem" x="77.5" y="116" width="5" height={STEM_BOT - 116} rx="2.5" fill="#6FAF7B" />
              <ellipse cx="68" cy="123" rx="10" ry="5.5" fill="#7FBF87" transform="rotate(-28 68 123)" />
              <ellipse cx="92" cy="119" rx="10" ry="5.5" fill="#8FCB95" transform="rotate(28 92 119)" />
              {/* little soil bump around the sprout's feet */}
              <ellipse cx="80" cy="154" rx="15" ry="5.5" fill="#7A5236" />
            </g>
          )}

          {/* stage 3–6 — stem + leaves */}
          {stage >= 3 && stage < 7 && (
            <g data-part="stem-and-leaves">
              <rect data-part="stem" x="76" y="74" width="8" height={STEM_BOT - 74} rx="4" fill={`url(#stem-${uid})`} />
              {leaves}
            </g>
          )}

          {/* stage 7–13 — a bud */}
          {stage >= 7 && stage < 14 && (
            <g data-part="bud">
              <rect data-part="stem" x="76" y="66" width="8" height={STEM_BOT - 66} rx="4" fill={`url(#stem-${uid})`} />
              {leaves}
              <g transform="rotate(-8 80 72)">
                <ellipse cx="80" cy="54" rx="11" ry="15" fill={pal.petal} stroke={pal.petalDeep} strokeWidth="1.5" />
                <path d="M74,46 Q80,38 86,46" fill="none" stroke={pal.petalDeep} strokeWidth="1.2" opacity="0.7" />
                <ellipse cx="72" cy="67" rx="8" ry="4.5" fill="#5E9E6C" transform="rotate(-32 72 67)" />
                <ellipse cx="88" cy="67" rx="8" ry="4.5" fill="#5E9E6C" transform="rotate(32 88 67)" />
              </g>
            </g>
          )}

          {/* stage 14–27 — half bloom: one open flower + a side bud */}
          {stage >= 14 && stage < 28 && (
            <g data-part="half-bloom">
              <rect data-part="stem" x="76" y="70" width="8" height={STEM_BOT - 70} rx="4" fill={`url(#stem-${uid})`} />
              {leaves}
              <path d="M80,120 Q62,114 54,104" fill="none" stroke="#5E9E6C" strokeWidth="4" strokeLinecap="round" />
              <ellipse cx="50" cy="99" rx="8" ry="11.5" fill={pal.petal} stroke={pal.petalDeep} strokeWidth="1.2" transform="rotate(-18 50 99)" />
              <FlowerG cx={80} cy={48} size={34} count={6} pal={pal} />
            </g>
          )}

          {/* stage 28+ — full glowing bouquet */}
          {stage >= 28 && (
            <g data-part="full-bloom">
              <rect data-part="stem" x="76" y="64" width="8" height={STEM_BOT - 64} rx="4" fill={`url(#stem-${uid})`} />
              {leaves}
              <path d="M80,118 Q60,114 50,104" fill="none" stroke="#5E9E6C" strokeWidth="4" strokeLinecap="round" />
              <path d="M80,126 Q102,124 114,114" fill="none" stroke="#5E9E6C" strokeWidth="4" strokeLinecap="round" />
              <path d="M78,130 Q72,131 69,132" fill="none" stroke="#5E9E6C" strokeWidth="3" strokeLinecap="round" />
              <FlowerG cx={47} cy={98} size={22} count={5} pal={SEED_PALETTES["sun-gold"]} />
              <FlowerG cx={116} cy={110} size={20} count={5} pal={SEED_PALETTES.mint} />
              <FlowerG cx={66} cy={133} size={15} count={4} pal={SEED_PALETTES.rose} />
              <FlowerG cx={80} cy={44} size={38} count={6} pal={pal} />
              {/* soft sparkles */}
              {[0, 1, 2, 3, 4].map((i) => {
                const a = (i / 5) * Math.PI * 2 - 0.4;
                const x = 80 + Math.cos(a) * 54;
                const y = 62 + Math.sin(a) * 48;
                return (
                  <motion.circle
                    key={i}
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#FFF6D8"
                    style={{ transformOrigin: `${x}px ${y}px` }}
                    animate={reduceMotion ? { opacity: 0.8 } : { opacity: [0, 1, 0], scale: [0.6, 1.3, 0.6] }}
                    transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.5 }}
                  />
                );
              })}
            </g>
          )}
        </motion.g>
      </svg>

      {/* 💧 burst after an extra sip — a tiny overlay, not a second plant */}
      {extraSip && (
        <motion.span
          initial={{ x: "-50%", scale: 0.6, opacity: 1 }}
          animate={{ x: "-50%", scale: 1.3, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute -top-2 left-1/2 text-lg"
          aria-hidden
        >
          💧
        </motion.span>
      )}
    </span>
  );
}


function WateredDots({ days }: { days: number[] }) {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const slots = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return (
    <div className="flex flex-wrap justify-center gap-1.5" style={{ maxWidth: 216 }}>
      {slots.map((d) => (
        <span
          key={d}
          className={cn(
            "h-2.5 w-2.5 rounded-full",
            days.includes(d)
              ? "bg-lavender-400/80 shadow-[inset_0_1px_2px_rgba(255,255,255,0.6)]"
              : "bg-white/40",
          )}
          aria-hidden
        />
      ))}
    </div>
  );
}

/* ─── Screen ──────────────────────────────────────────────────────── */

export default function MyLittlePlant() {
  const [state, setState] = useState<PlantState | null>(loadPlantState);
  const [shelf, setShelf] = useState<ShelfFlower[]>(loadShelf);
  const [wiggle, setWiggle] = useState(false);
  const [extraSip, setExtraSip] = useState(false);
  const [pickSeed, setPickSeed] = useState(false);
  const [milestoneToast, setMilestoneToast] = useState<number | null>(null);

  const water = useTapGuard(() => {
    if (!state) return;
    const { state: next, grew, milestone } = waterPlant(state);
    sfxWater();
    savePlantState(next);
    setState(next);
    if (grew) {
      setWiggle(true);
      setTimeout(() => setWiggle(false), 700);
      if (milestone) {
        setMilestoneToast(milestone);
        sfxArpeggio();
        setTimeout(() => setMilestoneToast(null), 2800);
      }
    } else {
      // extra sip same day
      setWiggle(true);
      setExtraSip(true);
      setTimeout(() => { setWiggle(false); setExtraSip(false); }, 700);
    }
  }, 400);

  const plantNewSeed = useCallback((color: SeedColor) => {
    const today = plantDateKey(0);
    const fresh: PlantState = {
      seed: color,
      plantedOn: today,
      careDays: 0,
      lastWateredOn: "",
      milestonesHit: [],
      dayOffset: 0,
      wateredMonthDays: [],
      wateredMonth: today.slice(0, 7),
    };
    savePlantState(fresh);
    setState(fresh);
    setPickSeed(false);
  }, []);

  const retire = useTapGuard(() => {
    if (!state) return;
    const flower = retireBloom(state);
    if (flower) {
      setShelf(loadShelf());
      setState(null);
      setPickSeed(true);
    }
  }, 400);

  const pal = useMemo(
    () => (state ? SEED_PALETTES[state.seed] : SEED_PALETTES.wisteria),
    [state],
  );
  const stageInfo = state ? stageForDays(state.careDays) : STAGES[0];
  const nextM = state ? nextMilestone(state.careDays) : 7;
  const daysUntil = state ? daysUntilNextMilestone(state.careDays) : 7;
  const monthDays = state ? currentMonthDaysWatered(state) : [];
  const today = plantDateKey(state?.dayOffset ?? 0);
  const alreadyWatered = state ? !canWaterToday(state) : false;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5">
      {/* header */}
      <div className="text-center">
        <p className="font-script text-2xl font-bold tracking-tight text-ink-deep">
          your streak plant is
        </p>
        <p
          className="mt-1.5 text-xl font-bold tracking-tight"
          style={{ color: pal.accent }}
        >
          {stageInfo.label}
        </p>
      </div>

      {/* cozy sky room */}
      <div
        className="relative flex flex-col justify-end overflow-hidden rounded-3xl border border-white/50 px-4 pb-5 pt-6"
        style={{
          background: "linear-gradient(180deg,#BFE0F7 0%,#DCEFFA 55%,#F3E9D8 100%)",
          boxShadow: "0 10px 30px -12px rgba(120,150,190,0.35)",
          minHeight: 320,
        }}
      >
        {/* decorative sky bits — stay at top, absolutely positioned */}
        <motion.span aria-hidden className="absolute top-4 left-6 text-3xl opacity-70" animate={{ x: [0, 12, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>☁️</motion.span>
        <motion.span aria-hidden className="absolute top-10 right-8 text-2xl opacity-60" animate={{ x: [0, -10, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>☁️</motion.span>
        <motion.span aria-hidden className="absolute top-2 left-1/3 text-2xl" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 4, repeat: Infinity }}>☀️</motion.span>

        {/* plant + pot = ONE svg unit, centered near the bottom of the sky card */}
        <div className="relative z-10 mx-auto flex flex-col items-center">
          {state ? (
            <PlantUnit
              stage={state.careDays}
              pal={pal}
              wiggle={wiggle}
              extraSip={extraSip}
              className="h-[264px] w-[176px]"
            />
          ) : (
            <div className="flex h-48 w-48 items-end justify-center">
              <span className="mb-14 text-5xl opacity-60">🪴</span>
            </div>
          )}
        </div>

        {/* missed-days note */}
        {state && state.lastWateredOn && state.lastWateredOn !== today && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 mx-auto mt-3 w-fit rounded-full bg-white/40 px-3 py-1.5 text-[11px] font-semibold text-[#5A6B8A]"
          >
            it waited for you 🌷 no rush, no guilt.
          </motion.p>
        )}

        {/* milestone toast */}
        <AnimatePresence>
          {milestoneToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="relative z-10 mx-auto mt-3 rounded-full bg-lavender-100/90 px-4 py-2 text-center text-xs font-bold text-ink-deep"
            >
              {milestoneToast === 7 && "you grew 7 days together — a new friend joins the bouquet 🌷"}
              {milestoneToast === 14 && "14 days — your bouquet is blooming beautifully 🌸"}
              {milestoneToast === 28 && "28 days — a glowing bouquet, right in your care 💮"}
              {milestoneToast === 100 && "100 days — a beautiful milestone, your garden shelf welcomes it 💜"}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* watering action */}
      {state && state.careDays < 100 && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={water}
            className="clay-btn flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white"
          >
            <span aria-hidden>🫗</span> water it 💧
          </button>
          {alreadyWatered && (
            <p className="text-center text-xs font-semibold text-ink-soft">
              one sip a day is perfect 💧
            </p>
          )}
        </div>
      )}

      {/* bloomed — full bouquet celebration */}
      {state && state.careDays >= 100 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 text-center">
          <p className="font-script text-xl font-bold text-ink-deep">you grew this together 💮</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={retire}
              className="clay-btn rounded-full px-5 py-2.5 text-xs font-bold text-white"
            >
              plant a new seed
            </button>
            <button
              type="button"
              onClick={() => setPickSeed(false)}
              className="clay-chip rounded-full px-5 py-2.5 text-xs font-bold text-ink-deep"
            >
              keep it glowing
            </button>
          </div>
        </motion.div>
      )}

      {/* stats: two side by side */}
      {state && (
        <div
          className="clay-card flex flex-wrap items-center justify-center gap-4 px-5 py-4"
          style={{ maxWidth: 440 }}
        >
          <div className="text-center">
            <p className="text-lg font-bold tracking-tight text-ink-deep">{state.careDays}</p>
            <p className="text-[11px] font-semibold text-ink-soft">Days — current streak</p>
          </div>
          <div className="h-8 w-px bg-white/50" aria-hidden />
          <div className="text-center">
            {nextM !== null ? (
              <>
                <p className="text-lg font-bold tracking-tight" style={{ color: pal.accent }}>
                  {daysUntil}
                </p>
                <p className="text-[11px] font-semibold text-ink-soft">next bloom at {nextM} days</p>
              </>
            ) : (
              <>
                <p className="text-lg font-bold tracking-tight" style={{ color: pal.accent }}>🌷</p>
                <p className="text-[11px] font-semibold text-ink-soft">in full bloom 💮</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* watered-day dots for current month */}
      {state && (
        <div className="flex items-center justify-center gap-2">
          <p className="text-[11px] font-semibold text-ink-soft">this month&apos;s sips:</p>
          <WateredDots days={monthDays} />
        </div>
      )}

      {/* seed picker */}
      <AnimatePresence>
        {pickSeed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="clay-card mx-auto w-full max-w-sm p-4"
          >
            <p className="text-center text-sm font-bold text-ink-deep">choose a seed</p>
            <p className="mt-0.5 text-center text-[11px] font-medium text-ink-soft">
              each one grows a different color
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {SEED_CHOICES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => plantNewSeed(s.id)}
                  className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/50 px-3 py-2.5 text-left transition-transform hover:scale-[1.03] active:scale-95"
                >
                  <span
                    className="h-6 w-6 rounded-full"
                    style={{ background: `radial-gradient(circle, ${s.petal} 0%, ${s.petalDeep} 100%)` }}
                  />
                  <span className="text-xs font-bold text-ink-deep">{s.name}</span>
                </button>
              ))}
            </div>
            {state === null && (
              <button
                type="button"
                onClick={() => setPickSeed(false)}
                className="mt-3 w-full text-[11px] font-bold text-ink-soft hover:text-ink-deep"
              >
                not yet
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* first-time invite */}
      {state === null && !pickSeed && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setPickSeed(true)}
            className="clay-btn rounded-full px-6 py-3 text-sm font-bold text-white"
          >
            plant a seed 🌱
          </button>
        </div>
      )}

      {/* shelf of past blooms */}
      {shelf.length > 0 && (
        <div className="clay-card p-4">
          <p className="text-xs font-bold text-ink-soft">your garden shelf 🌸</p>
          <div className="mt-2 flex gap-3 overflow-x-auto pb-1">
            {shelf.map((f, i) => {
              const p = SEED_PALETTES[f.color] ?? SEED_PALETTES.wisteria;
              return (
                <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-1">
                  <motion.span
                    className="relative flex h-10 w-10 items-center justify-center"
                    animate={{ opacity: [0.85, 1, 0.85] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <span
                      className="absolute h-10 w-10 rounded-full"
                      style={{ background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)` }}
                    />
                    <BloomFlowerSvg pal={p} size={24} petalCount={5} />
                  </motion.span>
                  <span className="text-[9px] font-semibold text-ink-soft">{f.bloomedOn}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Home mini-card ───────────────────────────────────────────────── */

/** Home-card line — "1 day · A Tiny Seed", never "1 days". */
export function plantCardLine(s: PlantState | null): string {
  if (!s) return "plant a seed to begin 🌱";
  const n = s.careDays;
  return `${n} day${n === 1 ? "" : "s"} · ${stageForDays(n).label}`;
}

/** Tiny status for the Home card: watered today 💤 / needs water 💧. */
export function plantCardStatus(s: PlantState | null): string | null {
  if (!s) return null;
  return canWaterToday(s) ? "needs water 💧" : "watered today 💤";
}

export function PlantHomeCard() {
  const [state, setState] = useState<PlantState | null>(loadPlantState);

  useEffect(() => {
    const refresh = () => setState(loadPlantState());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  const pal = state ? SEED_PALETTES[state.seed] : SEED_PALETTES.wisteria;
  const status = plantCardStatus(state);

  return (
    <Link
      to="/dashboard/plant"
      className="clay-card group flex w-full items-center gap-3 px-5 py-4 transition-transform hover:-translate-y-0.5"
    >
      {/* mini version of the SAME single-svg plant+pot, gently swaying */}
      {state ? (
        <span className="flex h-[72px] w-12 shrink-0 items-end justify-center">
          <PlantUnit stage={state.careDays} pal={pal} className="h-[72px] w-12" />
        </span>
      ) : (
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl opacity-70"
          aria-hidden
        >
          🪴
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold tracking-tight text-ink-deep">your little plant 🌱</p>
        <p className="truncate text-[11px] font-medium text-ink-soft">{plantCardLine(state)}</p>
        {status && (
          <p className="truncate text-[10px] font-semibold text-ink-soft">{status}</p>
        )}
      </div>
      <span aria-hidden className="text-sm text-ink-soft transition-colors group-hover:text-ink-deep">
        →
      </span>
    </Link>
  );
}
