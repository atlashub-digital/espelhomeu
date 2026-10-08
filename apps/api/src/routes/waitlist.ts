import { WaitlistSignup } from "@espelhomeu/shared";
import type { FastifyInstance } from "fastify";
import type { Db } from "../db/client";
import { waitlist } from "../db/schema";

export function waitlistRoutes(app: FastifyInstance, opts: { db?: Db }) {
  app.post(
    "/waitlist",
    { config: { rateLimit: { max: 5, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const parsed = WaitlistSignup.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ ok: false, error: "invalid" });
      if (!opts.db) return reply.code(503).send({ ok: false, error: "unavailable" });

      const { email, market, consentVersion } = parsed.data;
      // Repetir a inscrição não é erro e não revela se o email já existia.
      await opts.db.db.insert(waitlist).values({ email, market, consentVersion }).onConflictDoNothing();
      return reply.code(201).send({ ok: true });
    },
  );
}
