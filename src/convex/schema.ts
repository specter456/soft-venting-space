import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // passcode lock: salted SHA-256 hash, never the raw code.
      passcodeHash: v.optional(v.string()),
      passcodeSalt: v.optional(v.string()),
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // a single gentle check-in per user per day. dateKey is the user's local
    // day (YYYY-MM-DD) so "today" is correct in their own timezone.
    moodCheckins: defineTable({
      userId: v.id("users"),
      mood: v.string(), // one of the mood ids in src/lib/moods.ts
      intensity: v.number(), // 1 (a whisper) … 5 (a storm)
      note: v.optional(v.string()),
      dateKey: v.string(), // YYYY-MM-DD in the user's local time
    }).index("by_user_date", ["userId", "dateKey"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
