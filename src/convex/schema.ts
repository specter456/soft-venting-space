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

    // private voice / video expression recordings. only metadata lives here;
    // the actual media never leaves the device.
    recordings: defineTable({
      userId: v.id("users"),
      kind: v.union(v.literal("voice"), v.literal("video")),
      mood: v.optional(v.string()),
      duration: v.number(), // seconds
      noteId: v.optional(v.id("notes")),
      diaryId: v.optional(v.id("diaryEntries")),
    }).index("by_user", ["userId"]),

    // reflection notes — recordings, notes, and attachments are all optional
    // so a note can exist without a recording and vice versa.
    notes: defineTable({
      userId: v.id("users"),
      body: v.string(),
      mood: v.optional(v.string()),
      attachments: v.array(
        v.object({
          kind: v.union(
            v.literal("audio"),
            v.literal("video"),
            v.literal("photo"),
          ),
          label: v.string(),
          duration: v.optional(v.number()),
          art: v.optional(v.string()), // emoji art for video/photo placeholders
        }),
      ),
    }).index("by_user", ["userId"]),

    // diary pages — a cozy book with weather, stickers, and optional
    // attachments.
    diaryEntries: defineTable({
      userId: v.id("users"),
      title: v.string(),
      body: v.string(),
      mood: v.optional(v.string()),
      weather: v.string(), // emoji
      stickers: v.array(v.string()),
      attachments: v.array(
        v.object({
          kind: v.union(
            v.literal("audio"),
            v.literal("video"),
            v.literal("photo"),
          ),
          label: v.string(),
          duration: v.optional(v.number()),
          art: v.optional(v.string()),
        }),
      ),
    }).index("by_user", ["userId"]),

    // the double-locked photo vault: photos, video vents, doodles, stickers
    // and GIFs. only the owner can ever see these rows.
    vaultItems: defineTable({
      userId: v.id("users"),
      kind: v.union(
        v.literal("photo"),
        v.literal("video"),
        v.literal("gif"),
        v.literal("doodle"),
        v.literal("sticker"),
      ),
      art: v.string(), // emoji art shown on the placeholder tile
      bg: v.string(), // pastel tile class
      caption: v.optional(v.string()),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
