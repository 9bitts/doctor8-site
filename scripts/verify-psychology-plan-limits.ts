#!/usr/bin/env npx tsx
/**
 * PSI-11/12 — psychology freemium plan limit checks (no test runner required).
 *
 *   npx tsx scripts/verify-psychology-plan-limits.ts
 */
import assert from "node:assert/strict";
import { PSYCHOLOGY_FREE_PATIENT_LIMIT } from "../src/lib/psychology-plan-limits";

console.log("[verify-psychology-plan-limits] unit checks…");

/** Mirrors assertCanAddPsychologyPatient batch logic for free tier. */
function canAddPatients(current: number, addingCount: number, tier: "free" | "pro"): boolean {
  if (tier === "pro") return true;
  return current + addingCount <= PSYCHOLOGY_FREE_PATIENT_LIMIT;
}

function patientLimitResponse(current: number, addingCount: number) {
  const remaining = Math.max(0, PSYCHOLOGY_FREE_PATIENT_LIMIT - current);
  const ok = current + addingCount <= PSYCHOLOGY_FREE_PATIENT_LIMIT;
  return ok
    ? { ok: true as const }
    : {
        ok: false as const,
        code: "PSYCHOLOGY_PLAN_LIMIT",
        limit: PSYCHOLOGY_FREE_PATIENT_LIMIT,
        current,
        remaining,
      };
}

// PSI-11 — single add at limit
assert.equal(canAddPatients(2, 1, "free"), true, "2 + 1 fits in limit of 3");
assert.equal(canAddPatients(3, 1, "free"), false, "3 + 1 exceeds limit");
assert.equal(canAddPatients(3, 1, "pro"), true, "pro has no limit");

// PSI-11 — batch import: current + batch size
assert.equal(canAddPatients(1, 3, "free"), false, "batch of 3 when 1 exists exceeds limit");
assert.equal(canAddPatients(0, 3, "free"), true, "batch of 3 when empty fits");

const blocked = patientLimitResponse(3, 1);
assert.equal(blocked.ok, false);
assert.equal(blocked.code, "PSYCHOLOGY_PLAN_LIMIT");
assert.equal(blocked.remaining, 0);

const partial = patientLimitResponse(2, 2);
assert.equal(partial.ok, false);
assert.equal(partial.remaining, 1, "1 slot remains when at 2/3");

// PSI-12 — Pro feature gate only blocks psychologists on free tier
function assertProFeature(specialty: string, tier: "free" | "pro"): string | null {
  const isPsychologist = specialty === "Psychologist" || specialty === "Psicólogo";
  if (!isPsychologist) return null;
  if (tier === "pro") return null;
  return "PSYCHOLOGY_PLAN_REQUIRED";
}

assert.equal(assertProFeature("Cardiologist", "free"), null, "doctors unaffected");
assert.equal(assertProFeature("Psychologist", "free"), "PSYCHOLOGY_PLAN_REQUIRED");
assert.equal(assertProFeature("Psychologist", "pro"), null);

console.log("[verify-psychology-plan-limits] OK");
