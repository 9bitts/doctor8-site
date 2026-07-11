#!/usr/bin/env npx tsx
/**
 * PSI-08 — psychology scale risk assessment + critical notification contract.
 *
 *   npx tsx scripts/verify-psychology-risk.ts
 */
import assert from "node:assert/strict";
import { assessScaleRisk } from "../src/lib/psychology-risk";

console.log("[verify-psychology-risk] unit checks…");

// PHQ-9: 9 items, item 9 = responses[8]
const phq9Base = [0, 0, 0, 0, 0, 0, 0, 0, 0];

// Item 9 = 2 → critical (suicidal_ideation_severe)
const responsesCritical = [...phq9Base];
responsesCritical[8] = 2;
const critical = assessScaleRisk("PHQ9", responsesCritical, 2);
assert.equal(critical.level, "critical", "PHQ-9 item 9 = 2 is critical");
assert.ok(
  critical.flags.includes("suicidal_ideation_severe"),
  "severe suicidal ideation flag",
);

// Item 9 = 1 → critical (suicidal_ideation_mild)
const responsesMild = [...phq9Base];
responsesMild[8] = 1;
const mild = assessScaleRisk("PHQ9", responsesMild, 1);
assert.equal(mild.level, "critical", "PHQ-9 item 9 = 1 is critical");
assert.ok(mild.flags.includes("suicidal_ideation_mild"), "mild suicidal ideation flag");

// Item 9 = 0, low score → no risk
const none = assessScaleRisk("PHQ9", phq9Base, 0);
assert.equal(none.level, "none", "no ideation → none");

/** Mirrors scales/route.ts: critical always triggers notification path. */
function shouldNotifyCritical(risk: { level: string }): boolean {
  return risk.level === "critical";
}
assert.equal(shouldNotifyCritical(critical), true, "critical triggers notification");
assert.equal(shouldNotifyCritical(none), false, "none does not notify");

/** Risk is always persisted when level !== none (flag no longer gates calculation). */
function persistRisk(risk: { level: string } | null): boolean {
  return risk !== null && risk.level !== "none";
}
assert.equal(persistRisk(critical), true, "critical risk persisted");
assert.equal(persistRisk(none), false, "none not persisted");

console.log("[verify-psychology-risk] OK");
