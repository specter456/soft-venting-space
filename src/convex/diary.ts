import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const attachment = v.object({
  kind: v.union(v.literal("audio"), v.literal("video"), v.literal("photo")),
  label: v.string(),
  duration: v.optional(v.number()),
  art: v.optional(v.string()),
});

/** All diary pages, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const entries = await ctx.db
      .query("diaryEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return entries;
  },
});

export const create = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    mood: v.optional(v.string()),
    weather: v.string(),
    stickers: v.optional(v.array(v.string())),
    attachments: v.optional(v.array(attachment)),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    return await ctx.db.insert("diaryEntries", {
      userId,
      title: args.title,
      body: args.body,
      mood: args.mood,
      weather: args.weather,
      stickers: args.stickers ?? [],
      attachments: args.attachments ?? [],
    });
  },
});

export const remove = mutation({
  args: { id: v.id("diaryEntries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    const entry = await ctx.db.get(args.id);
    if (!entry || entry.userId !== userId) {
      throw new Error("Not yours to delete");
    }
    await ctx.db.delete(args.id);
  },
});
