#!/usr/bin/env node
// Best-effort cleanup before `next build`. Railway may keep `.next/cache` locked
// (EBUSY); never fail the build ? remove server output so middleware-manifest
// is always regenerated.

import fs from "node:fs";
import path from "node:path";

const nextDir = path.join(process.cwd(), ".next");

function rm(target, label) {
  if (!fs.existsSync(target)) return true;
  try {
    fs.rmSync(target, {
      recursive: true,
      force: true,
      maxRetries: 8,
      retryDelay: 250,
    });
    console.log(`[prebuild] removed ${label}`);
    return true;
  } catch (err) {
    console.warn(`[prebuild] could not remove ${label}:`, err.message);
    return false;
  }
}

if (!rm(nextDir, ".next")) {
  rm(path.join(nextDir, "server"), ".next/server");
  rm(path.join(nextDir, "static"), ".next/static");
  const buildId = path.join(nextDir, "BUILD_ID");
  if (fs.existsSync(buildId)) {
    try {
      fs.unlinkSync(buildId);
      console.log("[prebuild] removed .next/BUILD_ID");
    } catch (err) {
      console.warn("[prebuild] could not remove .next/BUILD_ID:", err.message);
    }
  }
}
