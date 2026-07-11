#!/usr/bin/env npx tsx
/**
 * AGD-06/07/19 — volunteer booking integrity checks (no test runner required).
 *
 *   npx tsx scripts/verify-volunteer-booking-integrity.ts
 *   npx tsx scripts/verify-volunteer-booking-integrity.ts --db
 */
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  AppointmentSlotTakenError,
  isActiveSlotUniqueViolation,
} from "../src/lib/fulfill-consultation";
import {
  resolveVolunteerScheduledProvider,
  SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
} from "../src/lib/scheduled-volunteer";
import { VolunteerSlotBookingError } from "../src/lib/volunteer-slot-booking";

console.log("[verify-volunteer-booking-integrity] unit checks…");

// resolveVolunteerScheduledProvider
assert.equal(
  resolveVolunteerScheduledProvider({
    bookingSource: "patient_panel",
    professionalId: "pro1",
    psychoanalystId: null,
    integrativeTherapistId: null,
  }),
  null,
  "paid booking: no volunteer provider",
);

assert.deepEqual(
  resolveVolunteerScheduledProvider({
    bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
    professionalId: "pro1",
    psychoanalystId: null,
    integrativeTherapistId: null,
  }),
  { id: "pro1", type: "health" },
);

assert.deepEqual(
  resolveVolunteerScheduledProvider({
    bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
    professionalId: null,
    psychoanalystId: "psy1",
    integrativeTherapistId: null,
  }),
  { id: "psy1", type: "psychoanalyst" },
);

assert.deepEqual(
  resolveVolunteerScheduledProvider({
    bookingSource: SCHEDULED_VOLUNTEER_BOOKING_SOURCE,
    professionalId: null,
    psychoanalystId: null,
    integrativeTherapistId: "int1",
  }),
  { id: "int1", type: "integrative" },
);

// isActiveSlotUniqueViolation
const slotP2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
  code: "P2002",
  clientVersion: "5.17.0",
  meta: { target: ["professionalId", "scheduledAt"] },
});
assert.equal(isActiveSlotUniqueViolation(slotP2002), true, "P2002 on scheduledAt");

const stripeP2002 = new Prisma.PrismaClientKnownRequestError("Unique constraint", {
  code: "P2002",
  clientVersion: "5.17.0",
  meta: { target: ["stripePaymentId"] },
});
assert.equal(isActiveSlotUniqueViolation(stripeP2002), false, "P2002 on stripePaymentId ignored");

assert.equal(isActiveSlotUniqueViolation(new Error("other")), false);

// VolunteerSlotBookingError codes used by volunteer-book/reschedule routes
const err = new VolunteerSlotBookingError("not_scheduled_volunteer_slot");
assert.equal(err.code, "not_scheduled_volunteer_slot");
assert.equal(err.name, "VolunteerSlotBookingError");

const slotErr = new AppointmentSlotTakenError();
assert.equal(slotErr.name, "AppointmentSlotTakenError");

console.log("[verify-volunteer-booking-integrity] unit checks OK");

async function runDbIntegration(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.log("[verify-volunteer-booking-integrity] skip DB (--db but no DATABASE_URL)");
    return;
  }

  const { PrismaClient } = await import("@prisma/client");
  const prisma = new PrismaClient();

  try {
    console.log("[verify-volunteer-booking-integrity] duplicate slot check…");
    const dupSql = `
      SELECT COUNT(*)::int AS groups
      FROM (
        SELECT "professionalId", "scheduledAt"
        FROM "Appointment"
        WHERE "professionalId" IS NOT NULL
          AND status IN ('CONFIRMED', 'PENDING')
        GROUP BY 1, 2
        HAVING COUNT(*) > 1
      ) d
    `;
    const [{ groups }] = await prisma.$queryRawUnsafe<{ groups: number }[]>(dupSql);
    assert.equal(groups, 0, `found ${groups} duplicate professional slot group(s)`);
    console.log("[verify-volunteer-booking-integrity] DB duplicate check OK");
  } finally {
    await prisma.$disconnect();
  }
}

const withDb = process.argv.includes("--db");
if (withDb) {
  runDbIntegration()
    .then(() => console.log("[verify-volunteer-booking-integrity] all checks passed"))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
} else {
  console.log("[verify-volunteer-booking-integrity] all checks passed (use --db for DATABASE_URL integration)");
}
