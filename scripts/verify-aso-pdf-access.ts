#!/usr/bin/env npx tsx
/**
 * ASO PDF access gate unit checks (no test runner required).
 *
 *   npx tsx scripts/verify-aso-pdf-access.ts
 */
import assert from "node:assert/strict";
import { resolveAsoPdfAccess } from "../src/lib/aso-pdf-access";

console.log("[verify-aso-pdf-access] unit checks…");

const companyA = "company-a";
const companyB = "company-b";

assert.deepEqual(
  resolveAsoPdfAccess({
    role: "EMPLOYER",
    hasEmployerMembership: true,
    employerCompanyId: companyA,
    hasPhysicianLink: false,
    examCompanyId: companyA,
  }),
  { allowed: true, scopeCompanyId: companyA },
  "employer of same company OK",
);

assert.deepEqual(
  resolveAsoPdfAccess({
    role: "OCCUPATIONAL_PHYSICIAN",
    hasEmployerMembership: false,
    employerCompanyId: null,
    hasPhysicianLink: true,
    examCompanyId: companyA,
  }),
  { allowed: true, scopeCompanyId: companyA },
  "linked physician OK",
);

assert.deepEqual(
  resolveAsoPdfAccess({
    role: "OCCUPATIONAL_PHYSICIAN",
    hasEmployerMembership: false,
    employerCompanyId: null,
    hasPhysicianLink: false,
    examCompanyId: companyA,
  }),
  { allowed: false, status: 403 },
  "physician of another company blocked",
);

assert.deepEqual(
  resolveAsoPdfAccess({
    role: "PATIENT",
    hasEmployerMembership: false,
    employerCompanyId: null,
    hasPhysicianLink: false,
    examCompanyId: companyA,
  }),
  { allowed: false, status: 403 },
  "patient blocked",
);

assert.deepEqual(
  resolveAsoPdfAccess({
    role: "EMPLOYER",
    hasEmployerMembership: true,
    employerCompanyId: companyA,
    hasPhysicianLink: false,
    examCompanyId: companyB,
  }),
  { allowed: false, status: 404 },
  "employer of different company not found",
);

console.log("[verify-aso-pdf-access] OK");
