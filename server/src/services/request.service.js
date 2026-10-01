import { and, eq, inArray, asc } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  rooms,
  participants,
  playbackRequests,
} from "../db/schema.js";
import {
  playbackRequestSchema,
} from "../validators/playbackRequest.schema.js";

export async function submitChangeRequest(
  roomId,
  participantId,
  action,
  payload
) {
  return db.transaction(async (tx) => {
    const [room] = await tx
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .for("update");

    if (!room) {
      return null;
    }

    const [requester] = await tx
      .select({
        id: participants.id,
        username: participants.username,
      })
      .from(participants)
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.roomId, roomId),
          eq(participants.role, "participant")
        )
      )
      .for("share");

    if (!requester) {
      return null;
    }

    if (action !== "change_video" && !room.videoId) {
      return null;
    }

    const [request] = await tx
      .insert(playbackRequests)
      .values({
        roomId,
        requesterId: requester.id,
        action,
        payload,
        status: "pending",
      })
      .returning();

    return { request, requester };
  });
}

export async function reviewChangeRequest(
  roomId,
  reviewerId,
  requestId,
  decision
) {
  return db.transaction(async (tx) => {
    // Lock the room while processing the decision
    const [room] = await tx
      .select()
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .for("update");

    if (!room) {
      return null;
    }

    // Verify the reviewer's current database role
    const [reviewer] = await tx
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.id, reviewerId),
          eq(participants.roomId, roomId),
          inArray(participants.role, ["host", "moderator"])
        )
      )
      .for("share");

    if (!reviewer) {
      return null;
    }

    // Only pending requests from this room can be reviewed
    const [request] = await tx
      .select()
      .from(playbackRequests)
      .where(
        and(
          eq(playbackRequests.id, requestId),
          eq(playbackRequests.roomId, roomId),
          eq(playbackRequests.status, "pending")
        )
      )
      .for("update");

    if (!request) {
      return null;
    }

    const now = new Date();
    let updatedRoom = null;

    if (decision === "approve") {
      // Validate the saved request before applying it
      const validation = playbackRequestSchema.safeParse({
        action: request.action,
        payload: request.payload,
      });

      if (!validation.success) {
        throw new Error("Stored request data is invalid");
      }

      const { action, payload } = validation.data;

      if (action !== "change_video" && !room.videoId) {
        return null;
      }

      const changes = {
        stateUpdatedAt: now,
      };

      if (action === "change_video") {
        changes.videoId = payload.videoId;
        changes.currentTime = 0;
        changes.isPlaying = false;
      } else if (action === "seek") {
        changes.currentTime = payload.time;
      } else {
        // Play/pause: calculate the current position
        const elapsedSeconds = room.isPlaying
          ? Math.max(
              0,
              (now.getTime() - room.stateUpdatedAt.getTime()) / 1000
            )
          : 0;

        changes.currentTime = room.currentTime + elapsedSeconds;
        changes.isPlaying = action === "play";
      }

      [updatedRoom] = await tx
        .update(rooms)
        .set(changes)
        .where(eq(rooms.id, roomId))
        .returning();
    }

    const [reviewedRequest] = await tx
      .update(playbackRequests)
      .set({
        status: decision === "approve" ? "approved" : "rejected",
        reviewedBy: reviewer.id,
        reviewedAt: now,
      })
      .where(eq(playbackRequests.id, request.id))
      .returning();

    return {
      request: reviewedRequest,
      room: updatedRoom,
    };
  });
}
export async function getPendingRequests(roomId, participantId) {
  return db.transaction(async (tx) => {
    // Check the participant's current database role
    const [reviewer] = await tx
      .select({ id: participants.id })
      .from(participants)
      .where(
        and(
          eq(participants.id, participantId),
          eq(participants.roomId, roomId),
          inArray(participants.role, ["host", "moderator"])
        )
      )
      .for("share");

    if (!reviewer) {
      return null;
    }

    return tx
      .select({
        request: playbackRequests,
        requester: {
          id: participants.id,
          username: participants.username,
        },
      })
      .from(playbackRequests)
      .leftJoin(
        participants,
        eq(playbackRequests.requesterId, participants.id)
      )
      .where(
        and(
          eq(playbackRequests.roomId, roomId),
          eq(playbackRequests.status, "pending")
        )
      )
      .orderBy(asc(playbackRequests.createdAt));
  });
}