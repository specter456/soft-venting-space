import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";
import { createDiaryEntry } from "@/lib/db";
import { useTapGuard } from "@/lib/useTapGuard";

const TALES_KEY = "venting-tiny-tales";

/* ─── Story data ──────────────────────────────────────────────────── */

interface StoryPage {
  text: string;
  emoji: string;
  choices?: [string, string]; // two flavor choices → both lead to next page
}

interface Story {
  id: string;
  title: string;
  emoji: string;
  pages: StoryPage[];
}

const STORIES: Story[] = [
  {
    id: "lantern",
    title: "The Lantern Path",
    emoji: "🏮",
    pages: [
      { text: "A soft amber lantern hangs by your window. It hums quietly, as if remembering something. You feel a gentle tug to follow its glow outside.", emoji: "🏮", choices: ["step outside into the dusk", "stay by the warm window a little longer"] },
      { text: "The lantern light leads you down a quiet path lined with fireflies. Each step feels lighter than the last. A small fox watches from the bushes, its eyes reflecting the lantern's warmth.", emoji: "🦊", choices: ["gently wave at the fox", "keep walking and let the fox decide"] },
      { text: "The path opens into a meadow of tall grass and soft wind. The lantern floats upward, leaving a trail of gold. You realize it was never about arriving — it was about feeling safe enough to walk.", emoji: "✨" },
    ],
  },
  {
    id: "cat",
    title: "The Cat on the Roof",
    emoji: "🐱",
    pages: [
      { text: "A small calico cat sits on the rooftop, purring at the moon. She doesn't look lonely — she looks content. She spots you and tilts her head, curious.", emoji: "🐱", choices: ["climb up to join her", "stay below and listen to her purr"] },
      { text: "The rooftop is cool and smooth. The cat stretches beside you, and you both watch the clouds drift slowly across the stars. She purrs louder, as if saying 'you made it.'", emoji: "☁️", choices: ["whisper a worry to the cat", "just sit quietly together"] },
      { text: "The cat places her paw on your hand — just once, very lightly. In that small touch, you feel understood. You stay until the moon dips low, and the world feels softer.", emoji: "🌙" },
    ],
  },
  {
    id: "bakery",
    title: "The Cloud Bakery",
    emoji: "☁️",
    pages: [
      { text: "High above, there's a bakery made entirely of clouds. The baker — a round, cheerful puffball — waves you inside. The smell of warm vanilla fills the air.", emoji: "🧁", choices: ["ask what they're baking today", "choose your own ingredients"] },
      { text: "The baker shows you a tray of meringues shaped like tiny moons. 'These are for making people smile,' they say. You add a pinch of cinnamon and a sprinkle of starlight.", emoji: "⭐", choices: ["bake one for a friend", "bake one for yourself"] },
      { text: "Your meringue comes out golden and glowing. The baker wraps it in a paper cloud and says, 'This one tastes like courage.' You take a bite and feel a warmth spread through your chest.", emoji: "☁️" },
    ],
  },
  {
    id: "garden",
    title: "The Midnight Garden",
    emoji: "🌺",
    pages: [
      { text: "At midnight, a hidden garden blooms behind your house. The flowers glow softly — lavender, moonflower, night jasmine. The air smells like rain and honey.", emoji: "🌸", choices: ["touch a glowing petal", "listen to the flowers' whispers"] },
      { text: "Each flower tells a different story. The lavender whispers of calm. The moonflower speaks of patience. The night jasmine says, 'you are exactly where you need to be.'", emoji: "🌺", choices: ["sit among them and breathe", "pick one to carry with you"] },
      { text: "You close your eyes and feel the garden around you — alive, gentle, knowing. When you open them, a single glowing petal rests in your palm, warm as a heartbeat.", emoji: "💜" },
    ],
  },
  {
    id: "lighthouse",
    title: "The Little Lighthouse",
    emoji: "🏠",
    pages: [
      { text: "On a quiet shore stands a small lighthouse with a golden door. Inside, a spiral staircase leads up to a room filled with maps and shells and warm blankets.", emoji: "🏠", choices: ["climb to the light room", "curl up by the window below"] },
      { text: "The light spins slowly, casting gentle beams across the dark water. Each beam carries a tiny message — 'you are safe,' 'you are enough,' 'rest now.'", emoji: "💡", choices: ["send a beam of your own", "watch the messages float away"] },
      { text: "The sea is calm. The light keeps spinning. You realize the lighthouse doesn't chase away the dark — it shows that light and dark can exist together, and both are beautiful.", emoji: "🌊" },
    ],
  },
  {
    id: "train",
    title: "The Train Through Clouds",
    emoji: "🚂",
    pages: [
      { text: "A pastel train waits at a station made of fog. Its windows glow warmly. A conductor with kind eyes tips their hat. 'All aboard — this train goes wherever you need to be.'", emoji: "🚂", choices: ["board the train and find a window seat", "ask the conductor where it's headed"] },
      { text: "The train glides through clouds that change color — soft pink, warm amber, gentle blue. Other passengers doze peacefully. The rhythm of the tracks feels like a lullaby.", emoji: "☁️", choices: ["watch the world through the window", "close your eyes and feel the movement"] },
      { text: "The train slows at a station of golden light. You feel rested, light, at peace. The conductor smiles. 'This is your stop — but you can always ride again.'", emoji: "✨" },
    ],
  },
];

function loadProgress(): Record<string, number> {
  try {
    const raw = safeGetItem(TALES_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, number>) {
  safeSetItem(TALES_KEY, JSON.stringify(progress));
}

/* ─── Component ───────────────────────────────────────────────────── */

export default function TinyTales() {
  const [open, setOpen] = useState(false);
  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [pageIdx, setPageIdx] = useState(0);
  const [progress, setProgress] = useState<Record<string, number>>(loadProgress);

  const story = activeStory;
  const isEnd = story ? pageIdx >= story.pages.length - 1 : false;

  const selectStory = useTapGuard((s: Story) => {
    setActiveStory(s);
    setPageIdx(progress[s.id] ?? 0);
  }, 300);

  const nextPage = useTapGuard(() => {
    if (!story) return;
    const next = pageIdx + 1;
    if (next < story.pages.length) {
      setPageIdx(next);
      const newProg = { ...progress, [story.id]: next };
      setProgress(newProg);
      saveProgress(newProg);
    }
  }, 300);

  const goBack = useTapGuard(() => {
    setActiveStory(null);
    setPageIdx(0);
  }, 300);

  const tuckToDiary = useTapGuard(() => {
    if (!story) return;
    const page = story.pages[pageIdx];
    createDiaryEntry({
      title: `${story.title} 🌙`,
      body: `${page.text}\n\n— a tiny tale`,
      weather: "🌤",
      stickers: [story.emoji],
      attachments: [],
    });
    setActiveStory(null);
    setPageIdx(0);
  }, 400);

  const anotherTale = useTapGuard(() => {
    setActiveStory(null);
    setPageIdx(0);
  }, 300);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="clay-card relative overflow-hidden rounded-[2rem] px-5 py-5 text-left transition-transform hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#E4E8F8] text-xl">📖</span>
          <div>
            <p className="text-sm font-bold tracking-tight text-ink-deep">tiny tales 📖</p>
            <p className="mt-0.5 text-[11px] font-medium text-ink-soft">two-minute cozy stories</p>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 px-5 backdrop-blur-sm"
            onClick={() => { setOpen(false); setActiveStory(null); setPageIdx(0); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="clay-card relative w-full max-w-sm overflow-hidden rounded-[2rem] px-6 py-7"
            >
              {!story ? (
                /* Story list */
                <div className="space-y-3">
                  <p className="text-center text-lg font-bold tracking-tight text-ink-deep">tiny tales 📖</p>
                  <p className="text-center text-xs font-medium text-ink-soft">pick a story</p>
                  {STORIES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => selectStory(s)}
                      className="flex w-full items-center gap-3 rounded-2xl bg-[#FDF5E6]/50 px-4 py-3 text-left transition-all hover:bg-[#FDF5E6]/80 hover:scale-[1.01]"
                    >
                      <span className="text-2xl">{s.emoji}</span>
                      <div>
                        <p className="text-sm font-bold text-ink-deep">{s.title}</p>
                        <p className="text-[10px] font-medium text-ink-soft">
                          {progress[s.id] !== undefined
                            ? `${progress[s.id] + 1}/${s.pages.length} pages`
                            : "new story ✦"}
                        </p>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="w-full text-center text-[11px] font-bold text-ink-soft hover:text-ink-deep"
                  >
                    close
                  </button>
                </div>
              ) : (
                /* Story page */
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={goBack}
                      className="text-[11px] font-bold text-ink-soft hover:text-ink-deep"
                    >
                      ← tales
                    </button>
                    <p className="text-[10px] font-medium text-ink-soft">
                      {pageIdx + 1} / {story.pages.length}
                    </p>
                  </div>

                  <AnimatePresence mode="wait">
                    <motion.div
                      key={pageIdx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-4"
                    >
                      <div className="text-center">
                        <p className="text-4xl">{story.pages[pageIdx].emoji}</p>
                        <h3 className="mt-3 font-script text-xl font-bold text-ink-deep">{story.title}</h3>
                      </div>
                      <p className="text-sm leading-relaxed text-ink">{story.pages[pageIdx].text}</p>

                      {isEnd ? (
                        <div className="space-y-3 pt-2">
                          <p className="font-script text-center text-lg font-bold text-ink-deep">the end 🌙</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={anotherTale}
                              className="flex-1 rounded-full border border-lavender-200 bg-lavender-50 px-4 py-2.5 text-xs font-bold text-lavender-700 transition-all hover:scale-105"
                            >
                              another tale
                            </button>
                            <button
                              type="button"
                              onClick={tuckToDiary}
                              className="flex-1 rounded-full bg-lavender-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:scale-105"
                            >
                              tuck into diary 📖
                            </button>
                          </div>
                        </div>
                      ) : story.pages[pageIdx].choices ? (
                        <div className="space-y-2 pt-1">
                          <p className="text-center text-[10px] font-medium text-ink-soft">choose what feels right</p>
                          {story.pages[pageIdx].choices!.map((c, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={nextPage}
                              className="w-full rounded-full border border-lavender-200 bg-lavender-50/60 px-4 py-2.5 text-xs font-bold text-ink-deep transition-all hover:bg-lavender-100/80 hover:scale-[1.01]"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="pt-2 text-center">
                          <button
                            type="button"
                            onClick={nextPage}
                            className="rounded-full bg-lavender-500 px-6 py-2.5 text-xs font-bold text-white transition-all hover:scale-105"
                          >
                            next →
                          </button>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
