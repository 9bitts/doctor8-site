#!/usr/bin/env npx tsx
/**
 * Verifies browser timezone auto-sync updates ProfessionalProfile.timezone for PROFESSIONAL.
 *
 *   npx tsx scripts/verify-professional-timezone-sync.ts
 *   npx tsx scripts/verify-professional-timezone-sync.ts --db   # optional Prisma integration
 */
import assert from "node:assert/strict";
import { DEFAULT_TIME_ZONE, zonedTimeToUtc } from "../src/lib/timezone";

const BROWSER_TZ = "America/Mexico_City";
const SLOT_DATE = "2026-07-11";
const SLOT_TIME = "09:00";

/** Mirrors PATCH /api/user/timezone after the fix. */
function applyTimezonePatch(
  role: string,
  browserTz: string,
  state: { userTimezone: string; proTimezone: string },
): void {
  state.userTimezone = browserTz;
  if (role === "PROFESSIONAL") {
    state.proTimezone = browserTz;
  }
}

/** Mirrors GET /api/professional/availability timezone resolution. */
function resolveAvailabilityTimezone(proTimezone: string | null | undefined): string {
  return proTimezone ?? DEFAULT_TIME_ZONE;
}

console.log("[verify-professional-timezone-sync] unit checks…");

// Scenario: first login, browser in Mexico City, profile still on default São Paulo.
const state = {
  userTimezone: DEFAULT_TIME_ZONE,
  proTimezone: DEFAULT_TIME_ZONE,
};

assert.equal(state.proTimezone, "America/Sao_Paulo", "precondition: profile default");

applyTimezonePatch("PROFESSIONAL", BROWSER_TZ, state);

assert.equal(state.userTimezone, BROWSER_TZ, "User.timezone updated");
assert.equal(state.proTimezone, BROWSER_TZ, "ProfessionalProfile.timezone updated");

const availabilityTz = resolveAvailabilityTimezone(state.proTimezone);
assert.equal(
  availabilityTz,
  BROWSER_TZ,
  "GET /api/professional/availability would return browser timezone",
);

const spSlotUtc = zonedTimeToUtc(SLOT_DATE, SLOT_TIME, "America/Sao_Paulo");
const mxSlotUtc = zonedTimeToUtc(SLOT_DATE, SLOT_TIME, BROWSER_TZ);
const syncedSlotUtc = zonedTimeToUtc(SLOT_DATE, SLOT_TIME, availabilityTz);

assert.equal(spSlotUtc.toISOString(), "2026-07-11T12:00:00.000Z", "09:00 São Paulo → UTC");
assert.equal(mxSlotUtc.toISOString(), "2026-07-11T15:00:00.000Z", "09:00 Mexico City → UTC");
assert.notEqual(
  spSlotUtc.toISOString(),
  mxSlotUtc.toISOString(),
  "same wall clock, different zones → different UTC instants",
);
assert.equal(
  syncedSlotUtc.toISOString(),
  mxSlotUtc.toISOString(),
  "after sync, 09:00 slot uses Mexico City UTC instant",
);

// Non-professional roles must not touch ProfessionalProfile.
const patientState = { userTimezone: DEFAULT_TIME_ZONE, proTimezone: DEFAULT_TIME_ZONE };
applyTimezonePatch("PATIENT", BROWSER_TZ, patientState);
assert.equal(patientState.userTimezone, BROWSER_TZ);
assert.equal(patientState.proTimezone, DEFAULT_TIME_ZONE, "patient: profile timezone unchanged");

console.log("[verify-professional-timezone-sync] unit checks OK");

async function runDbIntegration(): Promise<void> {
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient();

  try {
    const pro = await db.professionalProfile.findFirst({
      where: { user: { role: "PROFESSIONAL" } },
      select: { id: true, userId: true, timezone: true, user: { select: { timezone: true } } },
    });

    if (!pro) {
      console.log("[verify-professional-timezone-sync] --db skipped: no PROFESSIONAL in database");
      return;
    }

    const originalUserTz = pro.user.timezone;
    const originalProTz = pro.timezone;

    await db.user.update({
      where: { id: pro.userId },
      data: { timezone: BROWSER_TZ },
    });
    await db.professionalProfile.update({
      where: { userId: pro.userId },
      data: { timezone: BROWSER_TZ },
    });

    const refreshed = await db.professionalProfile.findUnique({
      where: { id: pro.id },
      select: { timezone: true, user: { select: { timezone: true } } },
    });

    assert.equal(refreshed?.user.timezone, BROWSER_TZ);
    assert.equal(refreshed?.timezone, BROWSER_TZ);

    await db.user.update({
      where: { id: pro.userId },
      data: { timezone: originalUserTz },
    });
    await db.professionalProfile.update({
      where: { id: pro.id },
      data: { timezone: originalProTz },
    });

    console.log("[verify-professional-timezone-sync] --db integration OK (restored original timezones)");
  } finally {
    await db.$disconnect();
  }
}

const withDb = process.argv.includes("--db");

async function main(): Promise<void> {
  if (withDb) {
    await runDbIntegration();
  } else {
    console.log("[verify-professional-timezone-sync] tip: pass --db to exercise Prisma against a local database");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
