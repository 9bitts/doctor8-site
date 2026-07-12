#!/usr/bin/env npx tsx
/**
 * Pharmacy dispense guard rules — static unit checks (no DB).
 *
 *   npx tsx scripts/verify-pharmacy-dispense-guards.ts
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  assertOrderPaidForDispense,
  assertPrescriptionDispensable,
  PHARMACY_ORDER_ACTIVE_STATUSES,
  PHARMACY_ORDER_PAID_STATUSES,
} from "../src/lib/pharmacy-network/dispense-guards";

console.log("[verify-pharmacy-dispense-guards] unit checks…");

const signedValid = {
  signatureStatus: "SIGNED" as const,
  validUntil: new Date(Date.now() + 86400000),
};
assert.equal(assertPrescriptionDispensable(signedValid), null);
assert.equal(
  assertPrescriptionDispensable({ ...signedValid, signatureStatus: "PENDING" }),
  "Receita não assinada digitalmente",
);
assert.equal(
  assertPrescriptionDispensable({
    ...signedValid,
    validUntil: new Date(Date.now() - 1000),
  }),
  "Receita expirada",
);

assert.equal(assertOrderPaidForDispense({ status: "PAID" }, true), null);
assert.equal(assertOrderPaidForDispense({ status: "PENDING_PAYMENT" }, true), "Pedido ainda não pago");
assert.equal(assertOrderPaidForDispense(null, false), null);

assert.ok(PHARMACY_ORDER_PAID_STATUSES.includes("PAID"));
assert.ok(PHARMACY_ORDER_ACTIVE_STATUSES.includes("PENDING_PAYMENT"));
assert.ok(!PHARMACY_ORDER_ACTIVE_STATUSES.includes("COMPLETED"));

const validateRoute = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/pharmacy-store/prescriptions/validate/route.ts"),
  "utf8",
);
assert.match(validateRoute, /assertPrescriptionDispensable/);
assert.match(validateRoute, /assertOrderPaidForDispense/);
assert.match(validateRoute, /createAuditLog/);

const ordersRoute = fs.readFileSync(
  path.join(process.cwd(), "src/app/api/patient/pharmacy/orders/route.ts"),
  "utf8",
);
assert.match(ordersRoute, /assertPrescriptionDispensable/);
assert.match(ordersRoute, /PHARMACY_ORDER_ACTIVE_STATUSES/);

console.log("[verify-pharmacy-dispense-guards] OK");
