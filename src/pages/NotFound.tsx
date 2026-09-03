import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Logo } from "@/components/Logo";
import { DocumentHead } from "@/components/DocumentHead";

interface NotFoundProps {
  title?: string;
}

export default function NotFound({ title }: NotFoundProps) {
  const navigate = useNavigate();

  return (
    <div
      className="relative flex min-h-dvh flex-col items-center justify-center px-5 text-ink"
      role="main"
    >
      <DocumentHead
        title="Page not found"
        description="This page doesn't exist, but your safe room is still here. Go back to Venting."
      />
      {/* dreamy blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-[#AAB6E3]/30 blur-2xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-[#F3E7C9]/30 blur-2xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="clay-card relative z-10 flex w-full max-w-sm flex-col items-center overflow-hidden rounded-[2.25rem] px-6 py-12 text-center"
      >
        {/* soft blobs inside card */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-14 -right-14 h-36 w-36 rounded-full bg-[#AAB6E3]/40 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-14 -left-14 h-36 w-36 rounded-full bg-[#F3E7C9]/40 blur-2xl"
        />

        <Logo className="relative h-16 w-16" />

        <h1 className="font-script relative mt-5 text-3xl font-bold tracking-tight text-ink-deep">
          {title ?? "this page drifted away…"}
        </h1>

        <p className="relative mt-2 text-sm font-medium text-ink-soft">
          but your safe room is still here 💜
        </p>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="clay-btn relative mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-bold text-white"
        >
          back to the safe room
        </button>
      </motion.div>
    </div>
  );
}
