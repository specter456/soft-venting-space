import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Record (or replace) the user's mood check-in for a local day.
 * One check-in per user per day — re-checking in updates today's entry.
 */
export const checkIn = mutation({
  args: {
    mood: v.string(),
    intensity: v.number(),
    note: v.optional(v.string()),
    dateKey: v.string(), // YYYY-MM-DD in the user's local timezone
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }

    const existing = await ctx.db
      .query("moodCheckins")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("dateKey", args.dateKey),
      )
      .first();

    const fields = {
      userId,
      mood: args.mood,
      intensity: args.intensity,
      note: args.note,
      dateKey: args.dateKey,
    };

    if (existing !== null) {
      await ctx.db.patch(existing._id, fields);
      return { id: existing._id, updated: true };
    }

    const id = await ctx.db.insert("moodCheckins", fields);
    return { id, updated: false };
  },
});

/** The user's check-in for a specific local day (null if they haven't yet). */
export const todayMood = query({
  args: { dateKey: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    return await ctx.db
      .query("moodCheckins")
      .withIndex("by_user_date", (q) =>
        q.eq("userId", userId).eq("dateKey", args.dateKey),
      )
      .first();
  },
});

/** The user's most recent check-ins, newest first (for the week strip). */
export const recentMoods = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return [];
    }
    return await ctx.db
      .query("moodCheckins")
      .withIndex("by_user_date", (q) => q.eq("userId", userId))
      .order("desc")
      .take(30);
  },
});
