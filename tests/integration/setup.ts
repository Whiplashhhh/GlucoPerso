/**
 * Integration tests run the real repositories against a dedicated PostgreSQL
 * database (never the dev one):
 *   INTEGRATION_DATABASE_URL (default: glucoperso_integration_test on the dev
 *   server, 127.0.0.1:5433). The database is created if missing, migrated,
 *   and emptied before every test file.
 * Kept apart from E2E_DATABASE_URL so both suites can share one server
 * without wiping each other.
 */
import { execSync } from "node:child_process";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll } from "vitest";

const url =
  process.env.INTEGRATION_DATABASE_URL ??
  "postgresql://glucoperso:glucoperso@localhost:5433/glucoperso_integration_test";
const databaseName = new URL(url).pathname.slice(1);
if (!/_test$/.test(databaseName)) {
  throw new Error("INTEGRATION_DATABASE_URL must point to a *_test database");
}

// Read by src/lib/env.ts on first import (setup files run before test files).
const photosDir = mkdtempSync(path.join(tmpdir(), "glucoperso-it-photos-"));
Object.assign(process.env, {
  DATABASE_URL: url,
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "integration-secret-integration-secret-0123",
  REGISTRATION_MODE: "invite",
  PHOTOS_DIR: photosDir,
  TRUSTED_PROXIES: "",
  SMTP_HOST: "",
});

async function withClient<T>(connectionString: string, run: (client: pg.Client) => Promise<T>) {
  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end();
  }
}

async function ensureDatabase() {
  const admin = new URL(url);
  admin.pathname = "/postgres";
  await withClient(admin.toString(), async (client) => {
    const { rowCount } = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      databaseName,
    ]);
    // The name was checked above (`*_test`) and is quoted as an identifier.
    if (!rowCount) await client.query(`CREATE DATABASE "${databaseName.replace(/"/g, '""')}"`);
  });
}

/** Applies migrations only when some are missing (setup runs once per file). */
async function ensureMigrated() {
  const expected = readdirSync(path.resolve("prisma/migrations"), { withFileTypes: true }).filter(
    (entry) => entry.isDirectory(),
  ).length;
  const applied = await withClient(url, async (client) => {
    const { rows } = await client.query<{ count: string }>(
      `SELECT count(*) FROM information_schema.tables WHERE table_name = '_prisma_migrations'`,
    );
    if (rows[0]?.count === "0") return 0;
    const done = await client.query<{ count: string }>(
      `SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
    );
    return Number(done.rows[0]?.count ?? 0);
  });
  if (applied >= expected) return;
  execSync("npx prisma migrate deploy", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: url },
  });
}

async function truncateAll() {
  await withClient(url, async (client) => {
    const { rows } = await client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'",
    );
    const tables = rows.map((row) => `"${row.tablename}"`).join(", ");
    if (tables) await client.query(`TRUNCATE ${tables} CASCADE`);
  });
}

beforeAll(async () => {
  await ensureDatabase();
  await ensureMigrated();
  await truncateAll();
});

afterAll(async () => {
  const { db } = await import("@/lib/db");
  await db.$disconnect();
  rmSync(photosDir, { recursive: true, force: true });
});
