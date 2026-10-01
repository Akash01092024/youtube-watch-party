import { z } from "zod";

export const playbackRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("play"),
    payload: z.object({}).strict().default({}),
  }),

  z.object({
    action: z.literal("pause"),
    payload: z.object({}).strict().default({}),
  }),

  z.object({
    action: z.literal("seek"),
    payload: z.object({
      time: z.number().finite().nonnegative(),
    }).strict(),
  }),

  z.object({
    action: z.literal("change_video"),
    payload: z.object({
      videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    }).strict(),
  }),
]);