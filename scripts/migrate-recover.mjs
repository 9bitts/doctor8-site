#!/usr/bin/env node
/** Run migration recovery only (no Next.js). Use via Railway shell if deploy is stuck. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

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
  return fs
    .readdirSync(migrationsDir)
    .filter((name) => fs.statSync(path.join(migrationsDir, name)).isDirectory())
    .sort();
}

console.log("[recover] Clearing failed migration rows...");
run("npx", ["prisma", "db", "execute", "--stdin"], {
  input: 'DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL;',
});

for (const name of listMigrations()) {
  console.log(`[recover] resolve --rolled-back ${name}`);
  run("npx", ["prisma", "migrate", "resolve", "--rolled-back", name]);
}

const code = run("npx", ["prisma", "migrate", "deploy"]);
process.exit(code);
