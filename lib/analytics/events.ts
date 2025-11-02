import { z } from "zod";

export const EventSchema = z.object({
  type: z.string().min(1),
  ts: z.number().int(),
  ctx: z.object({
    screen: z.string().optional(),
    version: z.string().optional(),
  }).optional(),
  props: z.record(z.any()).optional(),
});

export type AppEvent = z.infer<typeof EventSchema>;
