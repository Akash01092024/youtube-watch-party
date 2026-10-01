import { z } from "zod";
import { createRoom, joinRoom } from "../services/room.service.js";

const createRoomSchema = z.object({
  username: z
    .string({ error: "Username must be a string" })
    .trim()
    .min(1, { error: "Username is required" })
    .max(50, { error: "Username cannot exceed 50 characters" }),
});

export async function createRoomController(req, res) {
  const validation = createRoomSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const { username } = validation.data;

    const result = await createRoom(username);

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Create room failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not create room",
    });
  }
}
const joinRoomSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{8}$/, {
      error: "Room code must contain 8 letters or numbers",
    }),

  username: z
    .string({ error: "Username must be a string" })
    .trim()
    .min(1, { error: "Username is required" })
    .max(50, { error: "Username cannot exceed 50 characters" }),
});

export async function joinRoomController(req, res) {
  const validation = joinRoomSchema.safeParse({
    code: req.params.code,
    username: req.body?.username,
  });

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid request data",
      errors: validation.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  try {
    const { code, username } = validation.data;

    const result = await joinRoom(code, username);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    return res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Join room failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not join room",
    });
  }
}