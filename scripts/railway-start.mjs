#!/usr/bin/env node
/**
 * Railway start: run migrations (with one-time recovery for failed phase1), then Next.js.
 */
import { spawnSync } from "node:child_process";

const FAILED_PHASE1 = "20260626120000_organization_cnpj_phase1";
const port = process.env.PORT || "3000";

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return result.status ?? 1;
}

function migrateDeploy() {
  return run("npx", ["prisma", "migrate", "deploy"]);
}

console.log("[start] Running prisma migrate deploy...");
let code = migrateDeploy();

if (code !== 0) {
  console.warn(`[start] migrate deploy failed (code ${code}). Trying recovery for ${FAILED_PHASE1}...`);
  const resolveCode = run("npx", [
    "prisma",
    "migrate",
    "resolve",
    "--rolled-back",
    FAILED_PHASE1,
  ]);
  if (resolveCode !== 0) {
    console.warn("[start] migrate resolve returned non-zero; continuing anyway...");
  }
  code = migrateDeploy();
}

if (code !== 0) {
  console.error("[start] Database migrations failed. Fix _prisma_migrations and redeploy.");
  process.exit(code);
}

console.log(`[start] Starting Next.js on port ${port}...`);
const nextCode = run("npx", ["next", "start", "-p", port]);
process.exit(nextCode);
