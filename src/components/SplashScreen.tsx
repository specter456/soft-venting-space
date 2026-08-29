import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/Logo";

/**
 * Amazon-style splash screen: heart icon → "Venting" → soft smile line.
 * Shows for ~1.5 seconds then fades out smoothly.
 */
export function SplashScreen({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-[#EDEBF6]"
        >
          {/* soft background blobs */}
          <div
            aria-hidden
        className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#AAB6E3]/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#F3E7C9]/30 blur-2xl"
          />

          {/* heart icon */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 16 }}
          >
            <Logo className="h-24 w-24 drop-shadow-[0_12px_24px_rgba(120,100,160,0.3)]" />
          </motion.div>

          {/* name */}
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="font-script mt-5 text-4xl font-bold tracking-tight text-ink-deep"
          >
            Venting
          </motion.p>

          {/* soft smile line */}
          <motion.svg
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: 1, pathLength: 1 }}
            transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
            viewBox="0 0 60 20"
            className="mt-4 h-5 w-14"
            aria-hidden
          >
            <motion.path
              d="M 5 8 Q 30 22 55 8"
              fill="none"
              stroke="#c4a8e0"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
            />
          </motion.svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
