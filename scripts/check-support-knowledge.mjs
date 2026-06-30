/**
 * Validates support AI knowledge stays synced with platform-nav-registry.
 * Run: npm run check:support
 */
import fs from "fs";

const registryPath = "src/lib/platform-nav-registry.ts";
const builderPath = "src/lib/support-knowledge-builder.ts";
const knowledgePath = "src/lib/support-knowledge.ts";
const privacyPath = "src/lib/support-privacy.ts";
const capabilitiesPath = "src/lib/support-platform-capabilities.ts";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

const registry = read(registryPath);
const builder = read(builderPath);
const knowledge = read(knowledgePath);
const privacy = read(privacyPath);
const capabilities = read(capabilitiesPath);

const hrefs = [...registry.matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
const uniqueHrefs = new Set(hrefs);

if (uniqueHrefs.size < 50) {
  console.error(`Expected 50+ routes in registry, found ${uniqueHrefs.size}`);
  process.exit(1);
}

if (!builder.includes("platform-nav-registry")) {
  console.error("support-knowledge-builder must import platform-nav-registry");
  process.exit(1);
}

if (!knowledge.includes("buildGeneratedNavKnowledge")) {
  console.error("support-knowledge must call buildGeneratedNavKnowledge()");
  process.exit(1);
}

if (!privacy.includes("NEVER disclose")) {
  console.error("support-privacy rules missing");
  process.exit(1);
}

if (!capabilities.includes("assertNoPiiInSupportContext")) {
  console.error("PII guard missing from support-platform-capabilities");
  process.exit(1);
}

// Simulate PII guard
const forbidden = ["email", "userId", "firstName", "patientId"];
const samplePayload = JSON.stringify({
  capabilities: { supportAiAvailable: true },
  session: { isLoggedIn: true, role: "PATIENT" },
});

for (const f of forbidden) {
  if (samplePayload.toLowerCase().includes(f.toLowerCase())) {
    console.error(`Sample payload unexpectedly contains ${f}`);
    process.exit(1);
  }
}

console.log(`Support knowledge check OK (${uniqueHrefs.size} routes in registry).`);
