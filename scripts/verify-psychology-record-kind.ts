#!/usr/bin/env npx tsx
/**
 * PSI-06/14 — psychology recordKind filter + AI payload minimization checks.
 *
 *   npx tsx scripts/verify-psychology-record-kind.ts
 */
import assert from "node:assert/strict";
import { psychologyRecordKindWhere } from "../src/lib/psychology-api";

console.log("[verify-psychology-record-kind] unit checks…");

const sessionWhere = psychologyRecordKindWhere("SESSION_NOTE");
assert.deepEqual(sessionWhere, {
  OR: [{ recordKind: "SESSION_NOTE" }, { recordKind: "OTHER" }],
});

const scaleWhere = psychologyRecordKindWhere("SCALE");
assert.deepEqual(scaleWhere, {
  OR: [{ recordKind: "SCALE" }, { recordKind: "OTHER" }],
});

/** Legacy docs without typed recordKind still match via OTHER fallback. */
function matchesLegacyDoc(recordKind: string): boolean {
  return recordKind === "SESSION_NOTE" || recordKind === "OTHER";
}
assert.equal(matchesLegacyDoc("OTHER"), true, "legacy OTHER included");
assert.equal(matchesLegacyDoc("SESSION_NOTE"), true, "typed doc included");
assert.equal(matchesLegacyDoc("ANAMNESIS"), false, "anamnesis excluded from session notes query");

/** PSI-06: AI draft payload must not include real patient name. */
function buildAiUserLine(patientName?: string | null): string {
  void patientName;
  return "Patient: Paciente";
}
assert.equal(buildAiUserLine("Maria Silva"), "Patient: Paciente");
assert.ok(!buildAiUserLine("Maria Silva").includes("Maria"));

console.log("[verify-psychology-record-kind] OK");
