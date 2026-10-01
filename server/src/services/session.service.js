import { createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { rooms, participants } from "../db/schema.js";

export async function verifyRoomSession(code, sessionToken) {
  const tokenHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const [session] = await db
    .select({
      room: rooms,
      participant: {
        id: participants.id,
        username: participants.username,
        role: participants.role,
      },
    })
    .from(participants)
    .innerJoin(rooms, eq(participants.roomId, rooms.id))
    .where(
      and(
        eq(rooms.code, code),
        eq(participants.sessionTokenHash, tokenHash)
      )
    )
    .limit(1);

  return session ?? null;
}