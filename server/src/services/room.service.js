import { randomBytes, createHash } from "node:crypto";
import { db } from "../db/index.js";
import { rooms, participants } from "../db/schema.js";
import { generateRoomCode } from "../utils/generateCode.js";
import { eq } from "drizzle-orm";

export async function createRoom(username) {
  // Generate a secret token for the creator's session
  const sessionToken = randomBytes(32).toString("hex");

  // Store its hash in the database
  const sessionTokenHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  // Retry if a generated room code already exists
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode(8);

    const result = await db.transaction(async (tx) => {
      const [room] = await tx
        .insert(rooms)
        .values({ code })
        .onConflictDoNothing({ target: rooms.code })
        .returning();

      if (!room) {
        return null;
      }

      const [host] = await tx
        .insert(participants)
        .values({
          roomId: room.id,
          username,
          role: "host",
          sessionTokenHash,
        })
        .returning({
          id: participants.id,
          username: participants.username,
          role: participants.role,
        });

      return {
        room,
        participant: host,
        sessionToken,
      };
    });

    if (result) {
      return result;
    }
  }

  throw new Error("Could not generate an available room code");
}
export async function joinRoom(code, username) {
  const [room] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.code, code))
    .limit(1);

  if (!room) {
    return null;
  }

  const sessionToken = randomBytes(32).toString("hex");

  const sessionTokenHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const [participant] = await db
    .insert(participants)
    .values({
      roomId: room.id,
      username,
      role: "participant",
      sessionTokenHash,
    })
    .returning({
      id: participants.id,
      username: participants.username,
      role: participants.role,
    });

  return {
    room,
    participant,
    sessionToken,
  };
}