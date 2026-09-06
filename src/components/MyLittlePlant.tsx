/**
 * My Little Plant — Bloom Garden redesigned.
 * One pot, one plant, one sip a day. Stages 0–5 across ~6 real days,
 * guilt-free missed days, and a shelf of past blooms. All local.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  SEED_CHOICES,
  SEED_PALETTES,
  canWaterToday,
  daysBetween,
  loadPlantState,
  loadShelf,
  plantDateKey,
  plantStatusLine,
  retireBloom,
  savePlantState,
  waterPlant,
  type PlantState,
  type SeedPalette,
} from "@/lib/my-plant";
import { sfxWater, sfxArpeggio } from "@/pages/app/GamesScreen";
import { useTapGuard } from "@/lib/useTapGuard";

/* ─── visuals ─────────────────────────────────────────────────────── */

function BloomFlowerSvg({ pal, size }: { pal: SeedPalette; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88">
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <ellipse
          key={deg}
          cx="44"
          cy="44"
          rx="10"
          ry="20"
          fill={pal.petal}
          stroke={pal.petalDeep}
          strokeWidth="1.5"
          transform={`rotate(${deg} 44 44) translate(0 -14)`}
        />
      ))}
      <circle cx="44" cy="44" r="11" fill={pal.center} />
      <circle cx="44" cy="44" r="5" fill="rgba(255,255,255,0.55)" />
    </svg>
  );
}

function PlantArt({ stage, pal, glow }: { stage: number; pal: SeedPalette; glow: boolean }) {
  return (
    <motion.div
      className="relative flex h-44 w-44 items-end justify-center"
      animate={glow ? { rotate: [-2, 2, -2] } : { rotate: [0] }}
      transition={glow ? { duration: 4, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }}
    >
      {/* soil mound */}
      <div
        className="absolute bottom-6 h-3 w-20 rounded-full"
        style={{ background: "linear-gradient(180deg,#9B7653,#7A5A3A)" }}
      />

      {/* stem (stage 2+) */}
      {stage >= 2 && (
        <motion.div
          initial={{ scaleY: 0.3 }}
          animate={{ scaleY: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14 }}
          className="absolute bottom-8 w-1.5 rounded-full"
          style={{
            height: `${18 + stage * 8}px`,
            transformOrigin: "bottom",
            background: "linear-gradient(180deg,#7FB069,#4E8D5B)",
          }}
        />
      )}

      {/* leaves (stage 2+) */}
      {stage >= 2 && (
        <>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute rounded-full"
            style={{
              bottom: `${26 + stage * 6}px`,
              left: "28%",
              width: 16,
              height: 10,
              background: "linear-gradient(135deg,#8CC084,#5E9E6C)",
              rotate: "-25deg",
            }}
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute rounded-full"
            style={{
              bottom: `${24 + stage * 6}px`,
              right: "28%",
              width: 16,
              height: 10,
              background: "linear-gradient(135deg,#8CC084,#5E9E6C)",
              rotate: "25deg",
            }}
          />
        </>
      )}

      {/* seed (stage 0) */}
      {stage === 0 && (
        <motion.span
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-7 text-2xl"
        >
          🫘
        </motion.span>
      )}

      {/* sprout (stage 1) */}
      {stage === 1 && (
        <span
          className="absolute bottom-8 text-xl"
          style={{ filter: "drop-shadow(0 2px 3px rgba(90,140,100,0.3))" }}
        >
          🌱
        </span>
      )}

      {/* bud (stage 3) */}
      {stage === 3 && (
        <span
          className="absolute text-3xl"
          style={{
            bottom: `${26 + stage * 8}px`,
            filter: "drop-shadow(0 2px 4px rgba(90,90,140,0.25))",
          }}
        >
          🌷
        </span>
      )}

      {/* half bloom (stage 4) */}
      {stage === 4 && (
        <motion.span
          animate={{ rotate: [-3, 3, -3] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="absolute text-4xl"
          style={{ bottom: `${26 + stage * 8}px`, filter: `drop-shadow(0 2px 6px ${pal.glow})` }}
        >
          🌸
        </motion.span>
      )}

      {/* FULL BLOOM (stage 5) — vibrant glowing flower */}
      {stage === 5 && (
        <div className="absolute" style={{ bottom: `${26 + 5 * 8 + 8}px` }}>
          <motion.div
            className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: `radial-gradient(circle, ${pal.glow} 0%, transparent 65%)` }}
            animate={{ opacity: [0.5, 0.85, 0.5], scale: [1, 1.18, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative -translate-x-1/2 -translate-y-1/2">
            <motion.div
              animate={{ rotate: [0, -3, 3, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <BloomFlowerSvg pal={pal} size={88} />
            </motion.div>
          </div>
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.span
              key={i}
              className="absolute text-xs"
              style={{
                left: `${50 + Math.cos((i / 5) * 6.28) * 58}%`,
                top: `${50 + Math.sin((i / 5) * 6.28) * 58}%`,
              }}
              animate={{ opacity: [0, 1, 0], scale: [0.6, 1.2, 0.6] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.45 }}
            >
              ✨
            </motion.span>
          ))}
        </div>
      )}
    </motion.div>
  );
}

/* ─── game screen ─────────────────────────────────────────────────── */

const STAGE_NAMES = ["seed", "sprout", "little stem", "bud", "half-bloom", "FULL BLOOM"];

export default function MyLittlePlant() {
  const [state, setState] = useState<PlantState | null>(loadPlantState);
  const [shelf, setShelf] = useState(loadShelf);
  const [pickSeed, setPickSeed] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const [droplets, setDroplets] = useState<number[]>([]);

  // Refresh on mount — the day may have rolled over since last visit.
  useEffect(() => {
    setState(loadPlantState());
  }, []);

  const water = useTapGuard(() => {
    if (!state) return;
    if (!canWaterToday(state)) {
      // extra sip: happy wiggle, no double growth
      setWiggle(true);
      setTimeout(() => setWiggle(false), 600);
      sfxWater();
      return;
    }
    const { state: next, grew } = waterPlant(state);
    sfxWater();
    savePlantState(next);
    setState(next);
    if (grew && next.stage === 5) sfxArpeggio();
    const base = Date.now();
    setDroplets([base, base + 1, base + 2]);
    setTimeout(() => setDroplets([]), 900);
  }, 400);

  const plantNewSeed = useCallback((color: PlantState["seed"]) => {
    const fresh: PlantState = {
      stage: 0,
      seed: color,
      plantedOn: plantDateKey(0),
      lastWateredOn: "",
      dayOffset: 0,
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

  // Dev-only day override for testing: 5 quiet taps on the stage line.
  const [devTaps, setDevTaps] = useState(0);
  const onStageTap = useTapGuard(() => {
    if (!state) return;
    if (devTaps + 1 >= 5) {
      const next = { ...state, dayOffset: state.dayOffset + 1 };
      savePlantState(next);
      setState(next);
      setDevTaps(0);
    } else {
      setDevTaps(devTaps + 1);
    }
  }, 250);

  const pal = useMemo(
    () => (state ? SEED_PALETTES[state.seed] : SEED_PALETTES.wisteria),
    [state],
  );
  const isBloom = state?.stage === 5;
  const alreadyWatered = state ? !canWaterToday(state) : false;
  const day = state ? daysBetween(state.plantedOn, plantDateKey(state.dayOffset)) + 1 : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <GameIntroSlot sub="water it daily — watch it bloom over real days." />

      {/* ─── cozy sky room with the pot ───────────────────────────── */}
      <div
        className="relative overflow-hidden rounded-3xl border border-white/50 px-4 pb-4 pt-6"
        style={{
          background: "linear-gradient(180deg,#BFE0F7 0%,#DCEFFA 55%,#F3E9D8 100%)",
          boxShadow: "0 10px 30px -12px rgba(120,150,190,0.35)",
        }}
      >
        {/* drifting clouds */}
        <motion.span aria-hidden className="absolute top-4 left-6 text-3xl opacity-70" animate={{ x: [0, 14, 0] }} transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}>☁️</motion.span>
        <motion.span aria-hidden className="absolute top-10 right-8 text-2xl opacity-60" animate={{ x: [0, -10, 0] }} transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}>☁️</motion.span>
        <motion.span aria-hidden className="absolute top-2 left-1/3 text-2xl" animate={{ scale: [1, 1.08, 1] }} transition={{ duration: 4, repeat: Infinity }}>☀️</motion.span>
        <span aria-hidden className="absolute top-3 right-1/4 text-lg opacity-80">✦</span>

        {/* the plant */}
        <div className="relative z-10 flex justify-center">
          <motion.div animate={wiggle ? { rotate: [0, -5, 5, -3, 0] } : {}} transition={{ duration: 0.55 }}>
            {state ? (
              <PlantArt stage={state.stage} pal={pal} glow={isBloom === true} />
            ) : (
              <div className="flex h-44 w-44 items-end justify-center">
                <span className="mb-12 text-5xl opacity-60">🪴</span>
              </div>
            )}
          </motion.div>

          {/* watering droplets */}
          <AnimatePresence>
            {droplets.map((id, i) => (
              <motion.span
                key={id}
                initial={{ opacity: 0, y: -30 }}
                animate={{ opacity: 1, y: 46 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, delay: i * 0.08 }}
                className="absolute top-1/3 left-1/2 text-lg"
                style={{ marginLeft: `${(i - 1) * 12}px` }}
              >
                💧
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        {/* the pot */}
        <div
          className="relative z-10 mx-auto -mt-2 h-14 w-28 rounded-b-[2rem] rounded-t-xl border-2 border-[#C48B5E]/40"
          style={{ background: "linear-gradient(180deg,#E8A87C,#C97B4E)" }}
        >
          <div className="mx-auto mt-1 h-1.5 w-20 rounded-full bg-white/30" />
        </div>

        {/* status line (5 quiet taps = dev day advance for testing) */}
        <button
          type="button"
          onClick={state ? onStageTap : undefined}
          className="relative z-10 mx-auto mt-3 block w-fit rounded-full bg-white/45 px-4 py-1.5 text-xs font-bold text-[#3A4170]"
        >
          {state ? `day ${day} · ${STAGE_NAMES[state.stage] ?? ""}` : "no seed planted yet"}
        </button>

        {/* missed-days welcome — never guilt */}
        {state && state.lastWateredOn && state.lastWateredOn !== plantDateKey(state.dayOffset) && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10 mx-auto mt-2 w-fit rounded-full bg-white/40 px-3 py-1 text-[11px] font-semibold text-[#5A6B8A]"
          >
            it waited for you 🌷 no rush, no guilt.
          </motion.p>
        )}
      </div>

      {/* ─── actions ──────────────────────────────────────────────── */}
      {state && !isBloom && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={water}
            className="clay-btn flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white"
          >
            <span aria-hidden>🫗</span> water the plant
          </button>
          {alreadyWatered && (
            <p className="text-center text-xs font-semibold text-ink-soft">
              one sip a day is perfect 💧
            </p>
          )}
        </div>
      )}

      {/* ─── THE BLOOM ────────────────────────────────────────────── */}
      {isBloom && (
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

      {/* ─── seed picker ──────────────────────────────────────────── */}
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

      {/* ─── shelf of past blooms ─────────────────────────────────── */}
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
                    animate={{ opacity: [0.8, 1, 0.8] }}
                    transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
                  >
                    <span
                      className="absolute h-10 w-10 rounded-full"
                      style={{ background: `radial-gradient(circle, ${p.glow} 0%, transparent 70%)` }}
                    />
                    <BloomFlowerSvg pal={p} size={26} />
                  </motion.span>
                  <span className="text-[9px] font-semibold text-ink-soft">{f.bloomedOn}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
    </motion.div>
  );
}

/** Local intro header (keeps the same soft style as other games). */
function GameIntroSlot({ sub }: { sub: string }) {
  return (
    <div className="text-center">
      <p className="font-script text-2xl font-bold tracking-tight text-ink-deep">
        🌱 Bloom Garden
      </p>
      <p className="mt-1 text-sm font-medium text-ink-soft">{sub}</p>
    </div>
  );
}

/* ─── Home mini-card ───────────────────────────────────────────────── */

export function PlantHomeCard() {
  const [state, setState] = useState<PlantState | null>(loadPlantState);

  // Refresh when Home becomes visible again (the day may have changed).
  useEffect(() => {
    const refresh = () => setState(loadPlantState());
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  const pal = state ? SEED_PALETTES[state.seed] : null;

  return (
    <Link
      to="/dashboard/games?game=bloom"
      className="clay-card group flex items-center gap-3 px-5 py-4 transition-transform hover:-translate-y-0.5"
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
        {state && pal ? (
          state.stage >= 5 ? (
            <motion.span
              className="relative flex h-9 w-9 items-center justify-center"
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <span
                className="absolute h-9 w-9 rounded-full"
                style={{ background: `radial-gradient(circle, ${pal.glow} 0%, transparent 70%)` }}
              />
              <BloomFlowerSvg pal={pal} size={22} />
            </motion.span>
          ) : state.stage >= 1 ? (
            <span className="text-2xl">🪴</span>
          ) : (
            <span className="text-2xl">🫘</span>
          )
        ) : (
          <span className="text-2xl opacity-70">🪴</span>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold tracking-tight text-ink-deep">bloom garden</p>
        <p className="truncate text-[11px] font-medium text-ink-soft">
          {plantStatusLine(state)}
        </p>
      </div>
      <span aria-hidden className="text-sm text-ink-soft transition-colors group-hover:text-ink-deep">
        →
      </span>
    </Link>
  );
}
