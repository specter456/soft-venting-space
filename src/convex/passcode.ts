import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Store (or replace) the user's passcode as a salted hash. */
export const setPasscode = mutation({
  args: { hash: v.string(), salt: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Not signed in");
    }
    await ctx.db.patch(userId, {
      passcodeHash: args.hash,
      passcodeSalt: args.salt,
    });
  },
});

/**
 * The salted hash used to verify an unlock attempt. Only ever returned to the
 * signed-in user themselves — never exposed to anyone else.
 */
export const getPasscode = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user?.passcodeHash || !user.passcodeSalt) {
      return null;
    }
    return { hash: user.passcodeHash, salt: user.passcodeSalt };
  },
});

/** Whether this user has set up their passcode lock yet. */
export const hasPasscode = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      return false;
    }
    const user = await ctx.db.get(userId);
    return Boolean(user?.passcodeHash && user.passcodeSalt);
  },
});
