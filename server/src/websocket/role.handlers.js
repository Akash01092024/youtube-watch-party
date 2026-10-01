import { z } from "zod";
import {
  assignRole,
  removeParticipant,
} from "../services/role.service.js";
import { getPendingRequests } from "../services/request.service.js";
import { broadcastParticipants } from "./participants.js";

const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["participant", "moderator"]),
});

const removeParticipantSchema = z.object({
  userId: z.string().uuid(),
});

export function registerRoleHandlers(io, socket) {
  // ASSIGN ROLE
  socket.on("assign_role", async (payload) => {
    const { roomId, participant } = socket.data;

    if (!roomId || !participant) {
      socket.emit("app_error", {
        message: "Join a room first",
      });
      return;
    }

    const validation = assignRoleSchema.safeParse(payload);

    if (!validation.success) {
      socket.emit("app_error", {
        message: "Provide a valid userId and role",
      });
      return;
    }

    try {
      const { userId, role } = validation.data;

      const updatedParticipant = await assignRole(
        roomId,
        participant.id,
        userId,
        role
      );

      if (!updatedParticipant) {
        socket.emit("app_error", {
          message: "Host permission required or target user unavailable",
        });
        return;
      }

      for (const client of io.of("/").sockets.values()) {
        if (
          client.data.roomId === roomId &&
          client.data.participant?.id === updatedParticipant.id
        ) {
          client.data.participant = updatedParticipant;
        }
      }

      io.to(`room:${roomId}`).emit("role_assigned", {
        participant: updatedParticipant,
      });

      broadcastParticipants(io, roomId);

      // Load the backlog for a newly promoted moderator; clear it on demotion.
      const requests = await getPendingRequests(roomId, updatedParticipant.id);
      for (const client of io.of("/").sockets.values()) {
        if (
          client.data.roomId === roomId &&
          client.data.participant?.id === updatedParticipant.id &&
          client.connected
        ) {
          client.emit("pending_requests", { requests: requests ?? [] });
        }
      }
    } catch (error) {
      console.error("Assign role failed:", error);

      if (socket.connected) {
        socket.emit("app_error", {
          message: "Could not assign role",
        });
      }
    }
  });

  // REMOVE PARTICIPANT
  socket.on("remove_participant", async (payload) => {
    const { roomId, participant } = socket.data;

    if (!roomId || !participant) {
      socket.emit("app_error", {
        message: "Join a room first",
      });
      return;
    }

    const validation = removeParticipantSchema.safeParse(payload);

    if (!validation.success) {
      socket.emit("app_error", {
        message: "Provide a valid participant userId",
      });
      return;
    }

    try {
      const removed = await removeParticipant(
        roomId,
        participant.id,
        validation.data.userId
      );

      if (!removed) {
        socket.emit("app_error", {
          message: "Host permission required or target user unavailable",
        });
        return;
      }

      io.to(`room:${roomId}`).emit("participant_removed", {
        userId: removed.id,
        username: removed.username,
      });

      for (const client of io.of("/").sockets.values()) {
        if (
          client.data.roomId === roomId &&
          client.data.participant?.id === removed.id
        ) {
          client.disconnect(true);
        }
      }

      broadcastParticipants(io, roomId);
    } catch (error) {
      console.error("Remove participant failed:", error);

      if (socket.connected) {
        socket.emit("app_error", {
          message: "Could not remove participant",
        });
      }
    }
  });
}