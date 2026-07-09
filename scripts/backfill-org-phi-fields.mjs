#!/usr/bin/env node
/**
 * Encrypts legacy plaintext PHI in TissGuide and OrganizationEmployee.
 * Safe to re-run — skips values that already decrypt as encrypted.
 *
 *   node scripts/backfill-org-phi-fields.mjs
 *   node scripts/backfill-org-phi-fields.mjs --dry-run
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");

function encrypt(plaintext) {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) throw new Error("ENCRYPTION_KEY must be 32-byte hex");
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

function isEncrypted(stored) {
  if (!stored || !stored.includes(":")) return false;
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) return false;
  try {
    const [ivHex, authTagHex, encrypted] = stored.split(":");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    decipher.update(encrypted, "hex", "utf8");
    decipher.final("utf8");
    return true;
  } catch {
    return false;
  }
}

function maybeEncrypt(value) {
  if (value == null || value === "") return value;
  if (isEncrypted(value)) return value;
  return encrypt(value);
}

async function backfillTissGuides() {
  const guides = await prisma.tissGuide.findMany({
    select: { id: true, patientName: true, patientCpf: true, cardNumber: true },
  });
  let updated = 0;
  for (const g of guides) {
    const data = {
      patientName: maybeEncrypt(g.patientName),
      patientCpf: maybeEncrypt(g.patientCpf),
      cardNumber: maybeEncrypt(g.cardNumber),
    };
    const changed =
      data.patientName !== g.patientName ||
      data.patientCpf !== g.patientCpf ||
      data.cardNumber !== g.cardNumber;
    if (!changed) continue;
    updated += 1;
    if (!dryRun) {
      await prisma.tissGuide.update({ where: { id: g.id }, data });
    }
  }
  console.log(`[backfill-org-phi] TissGuide: ${updated} row(s)${dryRun ? " (dry-run)" : ""}`);
}

async function backfillEmployees() {
  const employees = await prisma.organizationEmployee.findMany({
    select: { id: true, cpf: true },
  });
  let updated = 0;
  for (const e of employees) {
    const cpf = maybeEncrypt(e.cpf);
    if (cpf === e.cpf) continue;
    updated += 1;
    if (!dryRun) {
      await prisma.organizationEmployee.update({ where: { id: e.id }, data: { cpf } });
    }
  }
  console.log(`[backfill-org-phi] OrganizationEmployee: ${updated} row(s)${dryRun ? " (dry-run)" : ""}`);
}

async function main() {
  await backfillTissGuides();
  await backfillEmployees();
}

main()
  .catch((err) => {
    console.error("[backfill-org-phi] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
