import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useTable, getKvFromCache, type MoodCheckin } from "@/lib/db";
import { todayDateKey } from "@/lib/moods";
import { safeGetItem, safeSetItem } from "@/lib/safe-storage";

const REMINDER_SHOWN_KEY = "venting-reminder-shown-today";

/**
 * Shows ONE gentle toast per day if:
 * - gentle reminders are enabled in settings
 * - the user has NOT checked in yet today
 * - the toast has NOT already been shown today (tracked in localStorage)
 *
 * Never streaks, counters, badges, guilt, or repeat nudges.
 */
export default function GentleReminder() {
  const checkins = useTable<MoodCheckin>("moodCheckins");
  const shownRef = useRef(false);

  useEffect(() => {
    // Only run once per mount
    if (shownRef.current) return;
    shownRef.current = true;

    // Check if reminders are enabled
    const enabled = getKvFromCache("gentleReminders") === "true";
    if (!enabled) return;

    // Check if already shown today
    const today = todayDateKey();
    const shownToday = safeGetItem(REMINDER_SHOWN_KEY);
    if (shownToday === today) return;

    // Check if user has checked in today
    const hasCheckedIn = checkins.some((c) => c.dateKey === today);
    if (hasCheckedIn) return;

    // Show the gentle toast
    toast("your safe room missed you 🌷", {
      description: "whenever you're ready, it's here.",
      duration: 5000,
      style: {
        background: "var(--theme-card, rgba(253,245,230,0.9))",
        border: "1px solid var(--theme-card-border, rgba(253,245,230,0.6))",
        color: "var(--theme-text, #3A4170)",
      },
    });

    // Mark as shown for today
    safeSetItem(REMINDER_SHOWN_KEY, today);
  }, [checkins]);

  // This component renders nothing — it only fires a side effect
  return null;
}
