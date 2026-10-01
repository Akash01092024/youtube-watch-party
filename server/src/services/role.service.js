import { and, eq, exists, inArray } from "drizzle-orm";
import { db } from "../db/index.js";
import { participants } from "../db/schema.js";

export async function assignRole(
  roomId,
  hostId,
  targetUserId,
  role
) {
  if (!["participant", "moderator"].includes(role)) {
    return null;
  }

  const authorizedHost = db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.id, hostId),
        eq(participants.roomId, roomId),
        eq(participants.role, "host")
      )
    );

  const [updatedParticipant] = await db
    .update(participants)
    .set({ role })
    .where(
      and(
        eq(participants.id, targetUserId),
        eq(participants.roomId, roomId),
        inArray(participants.role, ["participant", "moderator"]),
        exists(authorizedHost)
      )
    )
    .returning({
      id: participants.id,
      username: participants.username,
      role: participants.role,
    });

  return updatedParticipant ?? null;
}

export async function removeParticipant(
  roomId,
  hostId,
  targetUserId
) {
  const authorizedHost = db
    .select({ id: participants.id })
    .from(participants)
    .where(
      and(
        eq(participants.id, hostId),
        eq(participants.roomId, roomId),
        eq(participants.role, "host")
      )
    );

  const [removedParticipant] = await db
    .delete(participants)
    .where(
      and(
        eq(participants.id, targetUserId),
        eq(participants.roomId, roomId),
        inArray(participants.role, ["participant", "moderator"]),
        exists(authorizedHost)
      )
    )
    .returning({
      id: participants.id,
      username: participants.username,
    });

  return removedParticipant ?? null;
}