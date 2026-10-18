import { AsyncLocalStorage } from "node:async_hooks";
import type { TransactionSql } from "postgres";
import type { Db } from "../db/client";

export type RecordValue = Record<string, unknown>;
export interface AccessStore {
  /** Serializes read/modify/write across processes, including absent keys. */
  update<T>(key: string, fn: (value: RecordValue | null) => Promise<{ value: RecordValue; result: T }>): Promise<T>;
}
export function postgresAccessStore(db: Db): AccessStore {
  // Nested service updates share the transaction/connection: concurrent cooldown
  // locks must not exhaust the pool while waiting for an inner update.
  const context = new AsyncLocalStorage<TransactionSql>();
  return {
    async update<T>(key: string, fn: (value: RecordValue | null) => Promise<{ value: RecordValue; result: T }>): Promise<T> {
      const run = async (sql: TransactionSql) => {
        await sql`select pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
        const rows = await sql`select value from access_v1_records where key = ${key}`;
        const { value, result } = await fn(rows[0]?.value ?? null);
        await sql`insert into access_v1_records (key, value, updated_at) values (${key}, ${JSON.stringify(value)}::jsonb, now()) on conflict (key) do update set value = excluded.value, updated_at = now()`;
        return { result };
      };
      const active = context.getStore();
      const results = active ? await run(active) : await db.sql.begin(sql => context.run(sql, () => run(sql)));
      return results.result;
    },
  };
}
