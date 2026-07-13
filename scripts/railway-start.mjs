#!/usr/bin/env node
/**
 * Railway start: migrate deploy with automatic recovery for failed Prisma migrations.
 */
import { spawnSync } from "node:child_process";

const port = process.env.PORT || "3000";

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: options.stdio ?? "inherit",
    shell: process.platform === "win32",
    env: process.env,
    input: options.input,
    encoding: options.encoding,
  });
  return {
    code: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function migrateDeploy() {
  return run("npx", ["prisma", "migrate", "deploy"]).code;
}

function getFailedMigrationNames() {
  const { stdout, stderr } = run("npx", ["prisma", "migrate", "status"], {
    stdio: "pipe",
    encoding: "utf8",
  });
  const text = `${stdout}\n${stderr}`;
  const failed = [];
  let inFailed = false;

  for (const line of text.split("\n")) {
    const lower = line.toLowerCase();
    if (lower.includes("have failed") || lower.includes("failed migration")) {
      inFailed = true;
      continue;
    }
    if (inFailed) {
      const match = line.trim().match(/^(\d{14}_[A-Za-z0-9_]+)/);
      if (match) {
        failed.push(match[1]);
        continue;
      }
      if (
        line.trim() === "" ||
        lower.includes("database schema") ||
        lower.includes("migration history")
      ) {
        inFailed = false;
      }
    }
  }

  return failed;
}

function recoverMigrations() {
  console.warn("[start] Clearing stuck migration rows...");
  run("npx", ["prisma", "db", "execute", "--stdin"], {
    input: 'DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL;',
  });

  const failed = getFailedMigrationNames();
  if (failed.length === 0) {
    console.warn("[start] No failed migrations to resolve.");
    return;
  }

  for (const name of failed) {
    console.warn(`[start] migrate resolve --rolled-back ${name}`);
    run("npx", ["prisma", "migrate", "resolve", "--rolled-back", name]);
  }
}

console.log("[start] Doctor8 production boot...");
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
const nextCode = run("npx", ["next", "start", "-p", port]).code;
process.exit(nextCode);
