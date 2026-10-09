import { execSync } from "node:child_process";
import pg from "pg";
import { E2E_DATABASE_URL } from "./helpers";

/** Fresh test database before every e2e run (never the dev database). */
export default async function globalSetup() {
  if (!/_test\b/.test(E2E_DATABASE_URL)) {
    throw new Error("E2E_DATABASE_URL must point to a *_test database");
  }
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: E2E_DATABASE_URL },
  });

  const client = new pg.Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  const { rows } = await client.query<{ tablename: string }>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
  );
  const tables = rows.map((row) => `"${row.tablename}"`).join(", ");
  if (tables) await client.query(`TRUNCATE ${tables} CASCADE`);
  await client.end();
}
