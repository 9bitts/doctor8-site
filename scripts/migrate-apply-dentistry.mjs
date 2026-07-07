#!/usr/bin/env node
/**
 * Apply dentistry migration SQL directly (idempotent).
 * Use when _prisma_migrations says dentistry is applied but tables are missing.
 */
import { spawnSync } from "node:child_process";
import path from "node:path";

const migrationFile = path.join(
  process.cwd(),
  "prisma/migrations/20260708180000_dentistry_portal/migration.sql",
);

console.log("[dentistry] Applying SQL from", migrationFile);
const result = spawnSync(
  "npx",
  ["prisma", "db", "execute", "--file", migrationFile],
  { stdio: "inherit", shell: process.platform === "win32", env: process.env },
);

process.exit(result.status ?? 1);
