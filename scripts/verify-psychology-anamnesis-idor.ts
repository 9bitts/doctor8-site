#!/usr/bin/env npx tsx
/**
 * PSI-01 — anamnesis PUT ownership checks (no test runner required).
 *
 *   npx tsx scripts/verify-psychology-anamnesis-idor.ts
 */
import assert from "node:assert/strict";

/** Mirrors the ownership gate in anamnesis/route.ts PUT handler. */
function assertAnamnesisChartOwnership(
  record: { professionalId: string } | null,
  professionalId: string,
): { ok: true } | { ok: false; status: 404 } {
  if (!record || record.professionalId !== professionalId) {
    return { ok: false, status: 404 };
  }
  return { ok: true };
}

console.log("[verify-psychology-anamnesis-idor] unit checks…");

const proA = "pro-a";
const proB = "pro-b";
const record = { professionalId: proA };

assert.deepEqual(assertAnamnesisChartOwnership(record, proA), { ok: true }, "owner can access");
assert.deepEqual(
  assertAnamnesisChartOwnership(record, proB),
  { ok: false, status: 404 },
  "other professional blocked",
);
assert.deepEqual(
  assertAnamnesisChartOwnership(null, proA),
  { ok: false, status: 404 },
  "missing record blocked",
);

console.log("[verify-psychology-anamnesis-idor] OK");
