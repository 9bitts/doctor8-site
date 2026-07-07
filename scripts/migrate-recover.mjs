#!/usr/bin/env node
/**
 * Recover from a failed Prisma migration (production only).
 * Clears stuck rows and resolves ONLY failed migrations — never touches successful ones.
 */
import { spawnSync } from "node:child_process";

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

console.log("[recover] Clearing stuck migration rows (finished_at IS NULL)...");
run("npx", ["prisma", "db", "execute", "--stdin"], {
  input: 'DELETE FROM "_prisma_migrations" WHERE finished_at IS NULL;',
});

const failed = getFailedMigrationNames();
if (failed.length === 0) {
  console.log("[recover] No failed migrations reported by prisma migrate status.");
} else {
  for (const name of failed) {
    console.log(`[recover] resolve --rolled-back ${name}`);
    run("npx", ["prisma", "migrate", "resolve", "--rolled-back", name]);
  }
}

const { code } = run("npx", ["prisma", "migrate", "deploy"]);
process.exit(code);
