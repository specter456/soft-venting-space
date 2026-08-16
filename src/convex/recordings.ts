import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Every recording the signed-in user has made, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const recordings = await ctx.db
      .query("recordings")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return recordings;
  },
});

export const create = mutation({
  args: {
    kind: v.union(v.literal("voice"), v.literal("video")),
    mood: v.optional(v.string()),
    duration: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    return await ctx.db.insert("recordings", {
      userId,
      kind: args.kind,
      mood: args.mood,
      duration: Math.max(1, Math.round(args.duration)),
    });
  },
});

export const remove = mutation({
  args: { id: v.id("recordings") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    const rec = await ctx.db.get(args.id);
    if (!rec || rec.userId !== userId) {
      throw new Error("Not yours to delete");
    }
    await ctx.db.delete(args.id);
  },
});

/** Link a recording to a reflection note. */
export const attachToNote = mutation({
  args: { id: v.id("recordings"), noteId: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    const rec = await ctx.db.get(args.id);
    if (!rec || rec.userId !== userId) {
      throw new Error("Not yours to attach");
    }
    await ctx.db.patch(args.id, { noteId: args.noteId });
  },
});

/** Link a recording to a diary page. */
export const attachToDiary = mutation({
  args: { id: v.id("recordings"), diaryId: v.id("diaryEntries") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    const rec = await ctx.db.get(args.id);
    if (!rec || rec.userId !== userId) {
      throw new Error("Not yours to attach");
    }
    await ctx.db.patch(args.id, { diaryId: args.diaryId });
  },
});
