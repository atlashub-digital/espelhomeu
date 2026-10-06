import { z } from "zod";

export const HealthResponse = z.object({
  status: z.literal("ok"),
  service: z.string(),
  version: z.string(),
  db: z.enum(["up", "down", "not_configured"]),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
