import { expect, it } from "vitest";
import { createDb } from "../db/client";
import { postgresAccessStore } from "./store";
import { AccessService } from "./service";
import { supabaseProvider } from "./provider";
import { startSupabaseStub } from "./testing/fixtures";
import { randomBytes } from "node:crypto";
// Optional isolated PostgreSQL integration; never points to DATABASE_URL or Master.
it.skipIf(!process.env.ACCESS_TEST_DATABASE_URL)("PostgreSQL: consumo atómico entre instâncias, persistência após reinício e revogação", async () => {
  const db = createDb(process.env.ACCESS_TEST_DATABASE_URL!);
  const stub = await startSupabaseStub();
  const key = randomBytes(32);
  const provider = supabaseProvider(stub.url, "synthetic-service-role");
  const make = () => new AccessService(postgresAccessStore(db), provider, key, true);
  try {
    const first = make(); const second = make();
    const c = await first.challenge("durable@example.invalid", "otp", "local");
    const secret = (await second.previewSecret(c.challenge_id))!;
    const tokens = await Promise.all([first.verify(c.challenge_id, secret, "espelhomeu"), second.verify(c.challenge_id, secret, "espelhomeu")]);
    expect(tokens.filter(Boolean)).toHaveLength(1);
    const token = tokens.find(Boolean)!;
    const restarted = make();
    expect(await restarted.session(token)).toMatchObject({ project: "espelhomeu" });
    await restarted.logout(token);
    expect(await first.session(token)).toBeNull();
  } finally { await db.sql.end(); await stub.close(); }
});
