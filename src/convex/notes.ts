import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const attachment = v.object({
  kind: v.union(v.literal("audio"), v.literal("video"), v.literal("photo")),
  label: v.string(),
  duration: v.optional(v.number()),
  art: v.optional(v.string()),
});

/** All of the user's reflection notes, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const notes = await ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return notes;
  },
});

export const create = mutation({
  args: {
    body: v.string(),
    mood: v.optional(v.string()),
    attachments: v.optional(v.array(attachment)),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    return await ctx.db.insert("notes", {
      userId,
      body: args.body,
      mood: args.mood,
      attachments: args.attachments ?? [],
    });
  },
});

export const remove = mutation({
  args: { id: v.id("notes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    const note = await ctx.db.get(args.id);
    if (!note || note.userId !== userId) {
      throw new Error("Not yours to delete");
    }
    await ctx.db.delete(args.id);
  },
});
