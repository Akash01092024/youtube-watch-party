import { Server } from "socket.io";
import { z } from "zod";
import { verifyRoomSession } from "../services/session.service.js";
import { getPendingRequests } from "../services/request.service.js";
import { broadcastParticipants } from "./participants.js";
import { registerPlaybackHandlers } from "./playback.handlers.js";
import { registerRoleHandlers } from "./role.handlers.js";
import { registerRequestHandlers } from "./request.handlers.js";

const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/),

  sessionToken: z.string().regex(/^[a-f0-9]{64}$/),
});

export function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
    },
    transports: ["websocket"],
    maxHttpBufferSize: 16 * 1024,
  });

  io.on("connection", (socket) => {
    let verifying = false;

    registerPlaybackHandlers(io, socket);
    registerRoleHandlers(io, socket);
    registerRequestHandlers(io, socket);

    console.log("Client connected:", socket.id);

    socket.emit("connected", {
      message: "Send join_room to verify your session",
    });

    socket.on("join_room", async (payload) => {
      if (socket.data.participant || verifying) {
        socket.emit("app_error", {
          message: "Already joined or verification in progress",
        });
        return;
      }

      const validation = joinRoomSchema.safeParse(payload);

      if (!validation.success) {
        socket.emit("app_error", {
          message: "Invalid room code or session token",
          errors: validation.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        });
        return;
      }

      verifying = true;

      try {
        const { code, sessionToken } = validation.data;
        const session = await verifyRoomSession(code, sessionToken);

        if (!socket.connected) {
          return;
        }

        if (!session) {
          socket.emit("app_error", {
            message: "Invalid session token or room code",
          });
          return;
        }

        const room = session.room;
        const roomChannel = `room:${room.id}`;

        await socket.join(roomChannel);

        if (!socket.connected) {
          return;
        }

        socket.data.roomId = room.id;
        socket.data.participant = session.participant;

        socket.emit("room_joined", session);

        // Calculate the playback position at the time of joining
        const now = new Date();

        const elapsedSeconds = room.isPlaying
          ? Math.max(
              0,
              (now.getTime() -
                new Date(room.stateUpdatedAt).getTime()) /
                1000
            )
          : 0;

        // Send playback state to this joining socket
        socket.emit("sync_state", {
          videoId: room.videoId,
          isPlaying: room.isPlaying,
          currentTime: room.currentTime + elapsedSeconds,
          stateUpdatedAt: now.toISOString(),
        });

        // Send the participant list to everyone in the room
        broadcastParticipants(io, room.id);

        // Fetch pending requests with a database role check
        const pendingRequests = await getPendingRequests(
          room.id,
          session.participant.id
        );

        // Only an authorized Host/Moderator receives this event
        if (socket.connected && pendingRequests !== null) {
          socket.emit("pending_requests", {
            requests: pendingRequests,
          });
        }
      } catch (error) {
        console.error("Join room failed:", error);

        if (socket.connected) {
          socket.emit("app_error", {
            message: "Could not join room",
          });
        }
      } finally {
        verifying = false;
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("Client disconnected:", socket.id, reason);

      if (socket.data.roomId) {
        broadcastParticipants(io, socket.data.roomId);
      }
    });
  });

  return io;
}