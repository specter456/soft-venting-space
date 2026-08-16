import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Everything the user keeps in their private vault, newest first. */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const items = await ctx.db
      .query("vaultItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
    return items;
  },
});

export const create = mutation({
  args: {
    kind: v.union(
      v.literal("photo"),
      v.literal("video"),
      v.literal("gif"),
      v.literal("doodle"),
      v.literal("sticker"),
    ),
    art: v.string(),
    bg: v.string(),
    caption: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    return await ctx.db.insert("vaultItems", {
      userId,
      kind: args.kind,
      art: args.art,
      bg: args.bg,
      caption: args.caption,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("vaultItems") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    const item = await ctx.db.get(args.id);
    if (!item || item.userId !== userId) {
      throw new Error("Not yours to delete");
    }
    await ctx.db.delete(args.id);
  },
});
