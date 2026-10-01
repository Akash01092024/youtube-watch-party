import {
  pgTable,
  pgEnum,
  uuid,
  varchar,
  text,
  boolean,
  doublePrecision,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

export const roomRole = pgEnum("room_role", [
  "host",
  "moderator",
  "participant",
]);

export const rooms = pgTable("rooms", {
  id: uuid("id").defaultRandom().primaryKey(),

  code: varchar("code", { length: 12 }).notNull().unique(),

  videoId: varchar("video_id", { length: 11 }),

  isPlaying: boolean("is_playing").default(false).notNull(),

  currentTime: doublePrecision("current_time").default(0).notNull(),

  stateUpdatedAt: timestamp("state_updated_at", {
    withTimezone: true,
  }).defaultNow().notNull(),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow().notNull(),
});

export const participants = pgTable("participants", {
  id: uuid("id").defaultRandom().primaryKey(),

  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),

  username: varchar("username", { length: 50 }).notNull(),

  role: roomRole("role").default("participant").notNull(),

  sessionTokenHash: text("session_token_hash").notNull().unique(),

  joinedAt: timestamp("joined_at", {
    withTimezone: true,
  }).defaultNow().notNull(),
});
export const playbackRequestAction = pgEnum(
  "playback_request_action",
  ["play", "pause", "seek", "change_video"]
);

export const playbackRequestStatus = pgEnum(
  "playback_request_status",
  ["pending", "approved", "rejected"]
);

export const playbackRequests = pgTable("playback_requests", {
  id: uuid("id").defaultRandom().primaryKey(),

  roomId: uuid("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),

  requesterId: uuid("requester_id")
    .notNull()
    .references(() => participants.id, { onDelete: "cascade" }),

  action: playbackRequestAction("action").notNull(),

  payload: jsonb("payload").notNull(),

  status: playbackRequestStatus("status")
    .default("pending")
    .notNull(),

  reviewedBy: uuid("reviewed_by")
    .references(() => participants.id, { onDelete: "set null" }),

  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow().notNull(),

  reviewedAt: timestamp("reviewed_at", {
    withTimezone: true,
  }),
});