import {
  and,
  eq,
  exists,
  inArray,
  isNotNull,
} from "drizzle-orm";

import { db } from "../db/index.js";
import { rooms, participants } from "../db/schema.js";

export async function changeVideo(roomId, participantId, videoId) {
  const allowedParticipant = db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.roomId, roomId),
        inArray(participants.role, ["host", "moderator"])
      )
    );

  const [room] = await db
    .update(rooms)
    .set({
      videoId,
      isPlaying: false,
      currentTime: 0,
      stateUpdatedAt: new Date(),
    })
    .where(
      and(
        eq(rooms.id, roomId),
        exists(allowedParticipant)
      )
    )
    .returning();

  return room ?? null;
}

export async function setPlayback(roomId, participantId, isPlaying) {
  return db.transaction(async (tx) => {
    const allowedParticipant = tx
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.roomId, roomId),
          inArray(participants.role, ["host", "moderator"])
        )
      );

    const [room] = await tx
      .select()
      .from(rooms)
      .where(
        and(
          eq(rooms.id, roomId),
          exists(allowedParticipant)
        )
      )
      .for("update");

    if (!room || !room.videoId) {
      return null;
    }

    const now = new Date();

    const elapsedSeconds = room.isPlaying
      ? Math.max(
          0,
          (now.getTime() - room.stateUpdatedAt.getTime()) / 1000
        )
      : 0;

    const [updatedRoom] = await tx
      .update(rooms)
      .set({
        isPlaying,
        currentTime: room.currentTime + elapsedSeconds,
        stateUpdatedAt: now,
      })
      .where(
        and(
          eq(rooms.id, roomId),
          exists(allowedParticipant)
        )
      )
      .returning();

    return updatedRoom ?? null;
  });
}

export async function seekVideo(roomId, participantId, time) {
  const allowedParticipant = db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.id, participantId),
        eq(participants.roomId, roomId),
        inArray(participants.role, ["host", "moderator"])
      )
    );

  const [room] = await db
    .update(rooms)
    .set({
      currentTime: time,
      stateUpdatedAt: new Date(),
    })
    .where(
      and(
        eq(rooms.id, roomId),
        isNotNull(rooms.videoId),
        exists(allowedParticipant)
      )
    )
    .returning();

  return room ?? null;
}