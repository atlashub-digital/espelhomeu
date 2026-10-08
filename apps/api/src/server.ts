import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { buildApp } from "./app";
import { createDb } from "./db/client";
import { loadEnv } from "./env";

const env = loadEnv();

// Aplica as migrações pendentes antes de aceitar pedidos (a pasta drizzle/ vai na imagem Docker).
if (env.DATABASE_URL) {
  const { db, sql } = createDb(env.DATABASE_URL);
  try {
    await migrate(db, { migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)) });
  } catch (err) {
    // Não derrubar a API (o /health continua a responder); o erro fica nos logs do contentor.
    console.error("Falha ao aplicar migrações", err);
  } finally {
    await sql.end();
  }
}
const app = await buildApp(env);

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    app.close().then(() => process.exit(0));
  });
}

await app.listen({ port: env.PORT, host: env.HOST });
