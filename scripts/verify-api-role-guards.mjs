#!/usr/bin/env node
/**
 * Static checks for API role middleware rules (item #3).
 *   node scripts/verify-api-role-guards.mjs
 */
import assert from "node:assert/strict";

// Mirror of src/lib/api-route-roles.ts (keep in sync or import via tsx later)
const API_ROLE_RULES = [
  { prefix: "/api/patient", roles: ["PATIENT", "ADMIN"] },
  { prefix: "/api/professional", roles: ["PROFESSIONAL", "ADMIN"] },
  { prefix: "/api/pharmacy-store", roles: ["PHARMACY_STORE", "PROFESSIONAL", "ADMIN"] },
  { prefix: "/api/admin", roles: ["ADMIN"] },
];

function isApiRoleAllowed(pathname, role) {
  if (!role) return false;
  if (role === "ADMIN") return true;
  for (const { prefix, roles } of API_ROLE_RULES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return roles.includes(role);
    }
  }
  return true;
}

const cases = [
  { path: "/api/admin/doctors", role: "PATIENT", expect: false },
  { path: "/api/admin/doctors", role: "ADMIN", expect: true },
  { path: "/api/patient/profile", role: "PROFESSIONAL", expect: false },
  { path: "/api/patient/profile", role: "PATIENT", expect: true },
  { path: "/api/professional/records", role: "PATIENT", expect: false },
  { path: "/api/professional/records", role: "PROFESSIONAL", expect: true },
  { path: "/api/pharmacy-store/inventory", role: "PATIENT", expect: false },
  { path: "/api/pharmacy-store/inventory", role: "PHARMACY_STORE", expect: true },
  { path: "/api/pharmacy-store/prescriptions/validate", role: "PROFESSIONAL", expect: true },
];

for (const c of cases) {
  assert.equal(
    isApiRoleAllowed(c.path, c.role),
    c.expect,
    `${c.role} on ${c.path}`,
  );
}

console.log("[verify-api-role-guards] OK —", cases.length, "cases");
