import { z } from "zod";
import {
  changeVideo,
  setPlayback,
  seekVideo,
} from "../services/playback.service.js";

const changeVideoSchema = z.object({
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/, {
    error: "Enter an 11-character YouTube video ID",
  }),
});

const seekSchema = z.object({
  time: z
    .number()
    .finite()
    .nonnegative({ error: "Time cannot be negative" }),
});

export function registerPlaybackHandlers(io, socket) {
  // CHANGE VIDEO
  socket.on("change_video", async (payload) => {
    const { roomId, participant } = socket.data;

    if (!roomId || !participant) {
      socket.emit("app_error", {
        message: "Join a room first",
      });
      return;
    }

    const validation = changeVideoSchema.safeParse(payload);

    if (!validation.success) {
      socket.emit("app_error", {
        message: "Invalid video ID",
      });
      return;
    }

    try {
      const room = await changeVideo(
        roomId,
        participant.id,
        validation.data.videoId
      );

      if (!room) {
        socket.emit("app_error", {
          message: "Room unavailable or playback permission denied",
        });
        return;
      }

      io.to(`room:${roomId}`).emit("sync_state", {
        videoId: room.videoId,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        stateUpdatedAt: room.stateUpdatedAt,
      });
    } catch (error) {
      console.error("Change video failed:", error);

      if (socket.connected) {
        socket.emit("app_error", {
          message: "Could not change video",
        });
      }
    }
  });

  // PLAY AND PAUSE
  for (const [eventName, isPlaying] of [
    ["play", true],
    ["pause", false],
  ]) {
    socket.on(eventName, async () => {
      const { roomId, participant } = socket.data;

      if (!roomId || !participant) {
        socket.emit("app_error", {
          message: "Join a room first",
        });
        return;
      }

      try {
        const room = await setPlayback(
          roomId,
          participant.id,
          isPlaying
        );

        if (!room) {
          socket.emit("app_error", {
            message:
              "Room unavailable, no video selected, or playback permission denied",
          });
          return;
        }

        io.to(`room:${roomId}`).emit("sync_state", {
          videoId: room.videoId,
          isPlaying: room.isPlaying,
          currentTime: room.currentTime,
          stateUpdatedAt: room.stateUpdatedAt,
        });
      } catch (error) {
        console.error(`${eventName} failed:`, error);

        if (socket.connected) {
          socket.emit("app_error", {
            message: `Could not ${eventName} video`,
          });
        }
      }
    });
  }

  // SEEK
  socket.on("seek", async (payload) => {
    const { roomId, participant } = socket.data;

    if (!roomId || !participant) {
      socket.emit("app_error", {
        message: "Join a room first",
      });
      return;
    }

    const validation = seekSchema.safeParse(payload);

    if (!validation.success) {
      socket.emit("app_error", {
        message: "Time must be a non-negative number in seconds",
      });
      return;
    }

    try {
      const room = await seekVideo(
        roomId,
        participant.id,
        validation.data.time
      );

      if (!room) {
        socket.emit("app_error", {
          message:
            "Room unavailable, no video selected, or playback permission denied",
        });
        return;
      }

      io.to(`room:${roomId}`).emit("sync_state", {
        videoId: room.videoId,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        stateUpdatedAt: room.stateUpdatedAt,
      });
    } catch (error) {
      console.error("Seek failed:", error);

      if (socket.connected) {
        socket.emit("app_error", {
          message: "Could not seek video",
        });
      }
    }
  });
}