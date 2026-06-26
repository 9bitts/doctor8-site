#!/usr/bin/env node
/**
 * Railway start: migrate deploy with automatic recovery for failed Prisma migrations.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const port = process.env.PORT || "3000";
const migrationsDir = path.join(process.cwd(), "prisma/migrations");

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: options.stdio ?? "inherit",
    shell: process.platform === "win32",
    env: process.env,
    input: options.input,
  });
  return result.status ?? 1;
}

function listMigrations() {
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => fs.statSync(path.join(migrationsDir, name)).isDirectory())
    .sort();
}

function migrateDeploy() {
  return run("npx", ["prisma", "migrate", "deploy"]);
}

function clearFailedMigrationRows() {
  console.warn("[start] Clearing failed rows from _prisma_migrations...");
  const sql = 'DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL;';
  return run("npx", ["prisma", "db", "execute", "--stdin"], { input: sql });
}

function resolveAllRolledBack() {
  for (const name of listMigrations()) {
    console.warn(`[start] migrate resolve --rolled-back ${name}`);
    run("npx", ["prisma", "migrate", "resolve", "--rolled-back", name]);
  }
}

function recoverMigrations() {
  clearFailedMigrationRows();
  resolveAllRolledBack();
}

console.log("[start] Running prisma migrate deploy...");
let code = migrateDeploy();

let attempt = 0;
while (code !== 0 && attempt < 3) {
  attempt += 1;
  console.warn(`[start] migrate deploy failed. Recovery attempt ${attempt}/3...`);
  recoverMigrations();
  code = migrateDeploy();
}

if (code !== 0) {
  console.error("[start] Database migrations failed after recovery attempts.");
  process.exit(code);
}

console.log(`[start] Starting Next.js on port ${port}...`);
const nextCode = run("npx", ["next", "start", "-p", port]);
process.exit(nextCode);
