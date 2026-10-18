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

it.skipIf(!process.env.ACCESS_TEST_DATABASE_URL)("PostgreSQL: cooldown entre workers, reenvio único e operações aninhadas sem esgotar pool", async () => {
  const db = createDb(process.env.ACCESS_TEST_DATABASE_URL!);
  const stub = await startSupabaseStub();
  const key = randomBytes(32); let sent = 0;
  const make = () => new AccessService(postgresAccessStore(db), supabaseProvider(stub.url, "synthetic"), key, true, Date.now, { async send() { sent++; } });
  try {
    const a = make(), b = make();
    const results = await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? a : b).challenge("concurrent@example.invalid", "otp", "ip" + i)));
    expect(new Set(results.map(r => r.challenge_id)).size).toBe(1); expect(sent).toBe(1);
    // More independent outer transactions than pool connections.
    await Promise.all(Array.from({ length: 20 }, (_, i) => a.challenge(`parallel${i}@example.invalid`, "otp", "ip" + i)));
    expect(sent).toBe(21);
    const store = postgresAccessStore(db);
    await expect(store.update("rollback-outer", async () => {
      await store.update("rollback-inner", async () => ({ value: { mustRollback: true }, result: null }));
      throw new Error("rollback");
    })).rejects.toThrow("rollback");
    expect(await db.sql`select key from access_v1_records where key = 'rollback-inner'`).toHaveLength(0);
  } finally { await db.sql.end(); await stub.close(); }
});
