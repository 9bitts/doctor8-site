#!/usr/bin/env node
/**
 * Production build for Railway/CI — raises Node heap and skips in-build ESLint
 * (lint runs via `npm run lint` in CI). Typecheck still runs during `next build`.
 */
import { spawnSync } from "node:child_process";

const extra = "--max-old-space-size=6144";
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS
  ? `${process.env.NODE_OPTIONS} ${extra}`
  : extra;

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("npx", ["prisma", "generate"]);
run("npx", ["next", "build", "--no-lint"]);
