import { z } from "zod";
import {
  playbackRequestSchema,
} from "../validators/playbackRequest.schema.js";
import {
  submitChangeRequest,
  reviewChangeRequest,
} from "../services/request.service.js";

const reviewRequestSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(["approve", "reject"]),
});

export function registerRequestHandlers(io, socket) {
  // Submit a change request
  socket.on("request_change", async (payload) => {
    const { roomId, participant } = socket.data;

    if (!roomId || !participant) {
      socket.emit("app_error", {
        message: "Join a room first",
      });
      return;
    }

    const validation = playbackRequestSchema.safeParse(payload);

    if (!validation.success) {
      socket.emit("app_error", {
        message: "Invalid change request",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }

    try {
      const { action, payload: requestPayload } = validation.data;

      const result = await submitChangeRequest(
        roomId,
        participant.id,
        action,
        requestPayload
      );

      if (!result) {
        socket.emit("app_error", {
          message:
            "Participant permission required, room unavailable, or no video selected",
        });
        return;
      }

      if (socket.connected) {
        socket.emit("request_submitted", result);
      }

      // Notify online Hosts and Moderators in this room
      const roomChannel = `room:${roomId}`;

      for (const client of io.of("/").sockets.values()) {
        const role = client.data.participant?.role;

        if (
          client.rooms.has(roomChannel) &&
          ["host", "moderator"].includes(role)
        ) {
          client.emit("change_requested", result);
        }
      }
    } catch (error) {
      console.error("Submit request failed:", error);

      if (socket.connected) {
        socket.emit("app_error", {
          message: "Could not submit change request",
        });
      }
    }
  });

  // Approve or reject a pending request
  socket.on("review_request", async (payload) => {
    const { roomId, participant } = socket.data;

    if (!roomId || !participant) {
      socket.emit("app_error", {
        message: "Join a room first",
      });
      return;
    }

    const validation = reviewRequestSchema.safeParse(payload);

    if (!validation.success) {
      socket.emit("app_error", {
        message: "Provide a valid requestId and approve/reject decision",
      });
      return;
    }

    try {
      const { requestId, decision } = validation.data;

      const result = await reviewChangeRequest(
        roomId,
        participant.id,
        requestId,
        decision
      );

      if (!result) {
        socket.emit("app_error", {
          message:
            "Request unavailable, already reviewed, permission denied, or no video selected",
        });
        return;
      }

      const roomChannel = `room:${roomId}`;

      io.to(roomChannel).emit("request_reviewed", {
        request: result.request,
      });

      if (result.room) {
        io.to(roomChannel).emit("sync_state", {
          videoId: result.room.videoId,
          isPlaying: result.room.isPlaying,
          currentTime: result.room.currentTime,
          stateUpdatedAt: result.room.stateUpdatedAt,
        });
      }
    } catch (error) {
      console.error("Review request failed:", error);

      if (socket.connected) {
        socket.emit("app_error", {
          message: "Could not review request",
        });
      }
    }
  });
}