/**
 * My Little Plant — streak-based daily companion.
 * Smiley pot, vibrant bouquet that grows over days, stats, and dots.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
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
  plantStatusLine,
  retireBloom,
  savePlantState,
  stageForDays,
  waterPlant,
  type PlantState,
  type SeedColor,
  type SeedPalette,
  type ShelfFlower,
} from "@/lib/my-plant";
import { sfxWater, sfxArpeggio } from "@/pages/app/GamesScreen";
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

function PotWithFace({ wiggle }: { wiggle: boolean }) {
  return (
    <motion.div
      animate={wiggle ? { rotate: [0, -2.5, 2.5, -1.5, 0] } : { rotate: [0] }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="mx-auto relative flex h-16 w-28 items-end justify-center"
      style={{ transformOrigin: "center bottom" }}
    >
      {/* soil */}
      <div
        className="absolute bottom-1 left-1/2 h-2 w-20 -translate-x-1/2 rounded-full"
        style={{ background: "linear-gradient(180deg,#6B4A2E,#4A321E)" }}
      />
      {/* pot body */}
      <div
        className="relative z-10 mx-auto h-12 w-24 rounded-b-[1.6rem] rounded-t-xl border-2 border-[#7A4E2C]/50"
        style={{ background: "linear-gradient(180deg,#E8A87C 0%,#D88A5E 50%,#B86A3E 100%)" }}
      >
        {/* rim */}
        <div className="absolute top-0 left-1/2 h-1.5 w-24 -translate-x-1/2 rounded-full bg-[#F0C098]/80" />
        {/* eyes */}
        <span
          className="absolute top-[8px] left-[17%] h-2 w-2 rounded-full bg-[#3A2010]"
          aria-hidden
        />
        <span
          className="absolute top-[8px] right-[17%] h-2 w-2 rounded-full bg-[#3A2010]"
          aria-hidden
        />
        {/* blush cheeks */}
        <span
          className="absolute top-4 left-[12%] h-2 w-2 rounded-full bg-[#E89AA0]/70"
          aria-hidden
        />
        <span
          className="absolute top-4 right-[12%] h-2 w-2 rounded-full bg-[#E89AA0]/70"
          aria-hidden
        />
        {/* smile */}
        <span
          className="absolute top-4 left-1/2 h-1.5 w-4 -translate-x-1/2 rounded-full bg-[#3A2010]/70"
          aria-hidden
        />
      </div>
    </motion.div>
  );
}

function PlantVisual({
  stage,
  pal,
  wiggle,
  extraSip,
}: {
  stage: number;
  pal: SeedPalette;
  wiggle: boolean;
  extraSip: boolean;
}) {
  const isGlowing = stage >= 28;
  const petalCount = stage >= 7 ? 6 : stage >= 3 ? 4 : 3;

  return (
    <motion.div
      className="relative flex h-48 w-48 items-end justify-center"
      animate={wiggle ? { rotate: [0, -4, 4, -2, 0] } : { rotate: [0] }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {/* sky/gradient behind */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: isGlowing
            ? `radial-gradient(circle, ${pal.glow} 0%, rgba(255,255,255,0) 60%)`
            : "transparent",
        }}
      />
      {/* stem */}
      {stage >= 3 && (
        <motion.div
          className="absolute bottom-10 h-16 w-2 rounded-full"
          style={{
            background: "linear-gradient(180deg,#5E9E6C,#3E7A4E)",
            transformOrigin: "bottom",
          }}
          initial={{ scaleY: 0.3 }}
          animate={{ scaleY: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
        />
      )}
      {/* leaves */}
      {stage >= 3 && (
        <>
          <motion.div
            className="absolute rounded-full"
            style={{
              bottom: 18,
              left: "22%",
              width: 18,
              height: 12,
              background: "linear-gradient(135deg,#8CC084,#5E9E6C)",
              rotate: "-30deg",
              transformOrigin: "bottom",
            }}
            animate={wiggle ? { rotate: [-30, -35, -25, -30] } : {}}
            transition={{ duration: 0.4 }}
          />
          <motion.div
            className="absolute rounded-full"
            style={{
              bottom: 20,
              right: "20%",
              width: 18,
              height: 12,
              background: "linear-gradient(135deg,#8CC084,#5E9E6C)",
              rotate: "30deg",
              transformOrigin: "bottom",
            }}
            animate={wiggle ? { rotate: [30, 35, 25, 30] } : {}}
            transition={{ duration: 0.4 }}
          />
        </>
      )}
      {/* flowers / bouquet */}
      {stage >= 7 && (
        <div className="absolute bottom-0 left-1/2 h-0 w-0 -translate-x-1/2">
          {stage < 14 ? (
            /* small bouquet */
            <motion.div
              className="relative -translate-x-1/2"
              style={{ bottom: 26, transform: "translateY(0)" }}
              animate={isGlowing ? { y: [0, -3, 0] } : {}}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <BloomFlowerSvg pal={pal} size={42} petalCount={4} />
              <span className="absolute -top-1 left-1/2 h-5 w-5 -translate-x-1/2 text-xl" aria-hidden>🌿</span>
            </motion.div>
          ) : (
            /* lush vibrant multi-flower bouquet */
            <div className="relative -translate-x-1/2" style={{ bottom: 22 }}>
              <motion.div
                className="absolute -translate-x-1/2"
                style={{ bottom: 0, left: "50%", filter: `drop-shadow(0 0 8px ${pal.glow})` }}
                animate={isGlowing ? { scale: [1, 1.08, 1], rotate: [0, -2, 0] } : { scale: [1], rotate: [0] }}
                transition={{ duration: isGlowing ? 3.5 : 0.4, repeat: isGlowing ? Infinity : 0, ease: "easeInOut" }}
              >
                <BloomFlowerSvg pal={pal} size={52} petalCount={6} />
              </motion.div>
              {/* companion flowers in accent shades */}
              <motion.div
                className="absolute -translate-x-1/2"
                style={{ bottom: 8, left: "30%", filter: "drop-shadow(0 0 4px rgba(240,180,41,0.5))" }}
                animate={isGlowing ? { rotate: [0, -4, 0] } : {}}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <BloomFlowerSvg pal={SEED_PALETTES["sun-gold"]} size={28} petalCount={5} />
              </motion.div>
              <motion.div
                className="absolute -translate-x-1/2"
                style={{ bottom: 6, right: "28%", filter: "drop-shadow(0 0 4px rgba(143,217,196,0.5))" }}
                animate={isGlowing ? { rotate: [0, 4, 0] } : {}}
                transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              >
                <BloomFlowerSvg pal={SEED_PALETTES.mint} size={26} petalCount={5} />
              </motion.div>
              <motion.div
                className="absolute -translate-x-1/2"
                style={{ bottom: 10, left: "10%", filter: "drop-shadow(0 0 4px rgba(243,184,201,0.5))" }}
                animate={isGlowing ? { rotate: [0, -3, 0] } : {}}
                transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
              >
                <BloomFlowerSvg pal={SEED_PALETTES.rose} size={24} petalCount={4} />
              </motion.div>
              {/* sparkles around */}
              {isGlowing && (
                <>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <motion.span
                      key={i}
                      className="absolute text-xs"
                      style={{
                        left: `${50 + Math.cos((i / 5) * 6.28 - 0.4) * 72}%`,
                        top: `${50 + Math.sin((i / 5) * 6.28 - 0.4) * 62}%`,
                      }}
                      animate={{ opacity: [0, 1, 0], scale: [0.6, 1.4, 0.6] }}
                      transition={{ duration: 2.6, repeat: Infinity, delay: i * 0.5 }}
                      aria-hidden
                    >
                      ✨
                    </motion.span>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}
      {/* sprout (stage 1-2) */}
      {stage >= 1 && stage < 7 && (
        <span
          className="absolute bottom-10 text-3xl"
          style={{ filter: "drop-shadow(0 2px 4px rgba(90,140,100,0.3))" }}
        >
          {stage < 3 ? "🌱" : "🌿"}
        </span>
      )}
      {/* seed (stage 0) */}
      {stage === 0 && (
        <motion.span
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-10 text-3xl"
          aria-hidden
        >
          🫘
        </motion.span>
      )}
      {/* extra sip wiggle overlay */}
      {extraSip && (
        <motion.span
          initial={{ scale: 0.6, opacity: 1 }}
          animate={{ scale: 1.3, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 text-lg"
          aria-hidden
        >
          💧
        </motion.span>
      )}
    </motion.div>
  );
}

function WateredDots({ days }: { days: number[] }) {
  const slots = Array.from({ length: 28 }, (_, i) => i + 1);
  return (
    <div className="flex gap-1.5">
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

  useEffect(() => {
    setState(loadPlantState());
    setShelf(loadShelf());
  }, []);

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
    const fresh: PlantState = {
      seed: color,
      plantedOn: plantDateKey(0),
      careDays: 0,
      lastWateredOn: "",
      milestonesHit: [],
      dayOffset: 0,
      wateredMonthDays: [],
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
        className="relative overflow-hidden rounded-3xl border border-white/50 px-4 pb-6 pt-6"
        style={{
          background: "linear-gradient(180deg,#BFE0F7 0%,#DCEFFA 55%,#F3E9D8 100%)",
          boxShadow: "0 10px 30px -12px rgba(120,150,190,0.35)",
        }}
      >
        {/* decorative sky bits */}
        <motion.span aria-hidden className="absolute top-4 left-6 text-3xl opacity-70" animate={{ x: [0, 12, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>☁️</motion.span>
        <motion.span aria-hidden className="absolute top-10 right-8 text-2xl opacity-60" animate={{ x: [0, -10, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>☁️</motion.span>
        <motion.span aria-hidden className="absolute top-2 left-1/3 text-2xl" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 4, repeat: Infinity }}>☀️</motion.span>

        {/* plant visual */}
        <div className="relative z-10 flex justify-center">
          {state ? (
            <PlantVisual stage={state.careDays} pal={pal} wiggle={wiggle} extraSip={extraSip} />
          ) : (
            <div className="flex h-48 w-48 items-end justify-center">
              <span className="mb-14 text-5xl opacity-60">🪴</span>
            </div>
          )}
        </div>

        {/* pot with smiley face */}
        <div className="relative z-10 mx-auto mt-1">
          <PotWithFace wiggle={wiggle} />
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
            <p className="text-lg font-bold tracking-tight" style={{ color: pal.accent }}>
              {daysUntil}
            </p>
            <p className="text-[11px] font-semibold text-ink-soft">next bloom at {nextM} days</p>
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

export function PlantHomeCard() {
  const [state, setState] = useState<PlantState | null>(loadPlantState);

  useEffect(() => {
    const refresh = () => setState(loadPlantState());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  const pal = state ? SEED_PALETTES[state.seed] : null;
  const stageInfo = state ? stageForDays(state.careDays) : null;

  return (
    <Link
      to="/dashboard/games?route=plant"
      className="clay-card group flex w-full items-center gap-3 px-5 py-4 transition-transform hover:-translate-y-0.5"
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        {state && pal ? (
          state.careDays >= 28 ? (
            <motion.span
              className="relative flex h-9 w-9 items-center justify-center"
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span
                className="absolute h-9 w-9 rounded-full"
                style={{ background: `radial-gradient(circle, ${pal.glow} 0%, transparent 70%)` }}
              />
              <BloomFlowerSvg pal={pal} size={20} petalCount={5} />
            </motion.span>
          ) : state.careDays >= 7 ? (
            <span className="text-2xl">🌸</span>
          ) : state.careDays >= 1 ? (
            <span className="text-2xl">🌱</span>
          ) : (
            <span className="text-2xl">🫘</span>
          )
        ) : (
          <span className="text-2xl opacity-70">🪴</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold tracking-tight text-ink-deep">your little plant 🌱</p>
        <p className="truncate text-[11px] font-medium text-ink-soft">
          {stageInfo && state ? `${state.careDays} days · ${stageInfo.label}` : plantStatusLine(state)}
        </p>
      </div>
      <span aria-hidden className="text-sm text-ink-soft transition-colors group-hover:text-ink-deep">
        →
      </span>
    </Link>
  );
}
