import { z } from "zod";

export const connectGroupSchema = z.object({
  groupId: z.string(),
});

export const sendMessageSchema = z.object({
  message: z.string(),
});

export const sendMessageGroupSchema = z.object({
  message: z.string(),
  groupId: z.string(),
});
