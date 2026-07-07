#!/usr/bin/env node
/**
 * Mark migrations as already applied without re-running SQL.
 * Use when migrate:recover accidentally rolled back migrations that are already in the DB.
 *
 * Example (Railway shell):
 *   node scripts/migrate-repair-rolled-back.mjs \
 *     20260626120000_organization_cnpj_phase1 \
 *     20260626140000_organization_phase2
 */
import { spawnSync } from "node:child_process";

const names = process.argv.slice(2);
if (names.length === 0) {
  console.error("Usage: node scripts/migrate-repair-rolled-back.mjs <migration_name> [...]");
  process.exit(1);
}

function run(args) {
  const result = spawnSync("npx", args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return result.status ?? 1;
}

for (const name of names) {
  console.log(`[repair] migrate resolve --applied ${name}`);
  const code = run(["prisma", "migrate", "resolve", "--applied", name]);
  if (code !== 0) process.exit(code);
}

console.log("[repair] Done. Run: npx prisma migrate deploy");
process.exit(0);
