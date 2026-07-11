#!/usr/bin/env node
/**
 * Optional backfill: set recordKind on legacy psychology CLINICAL_NOTE docs.
 * Does NOT run automatically — operator must invoke explicitly.
 *
 *   node scripts/backfill-psychology-record-kind.mjs --dry-run
 *   node scripts/backfill-psychology-record-kind.mjs --apply
 */
import { PrismaClient } from "@prisma/client";
import { createDecipheriv } from "node:crypto";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run") || !process.argv.includes("--apply");

function getKey() {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error("ENCRYPTION_KEY (64 hex chars) required");
  return Buffer.from(hex, "hex");
}

function decrypt(stored) {
  const [ivHex, authTagHex, encrypted] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let out = decipher.update(encrypted, "hex", "utf8");
  out += decipher.final("utf8");
  return out;
}

function safeDecrypt(stored) {
  if (!stored) return "";
  try {
    return decrypt(stored);
  } catch {
    return stored;
  }
}

function inferKind(contentJson) {
  let parsed;
  try {
    parsed = JSON.parse(contentJson);
  } catch {
    return null;
  }
  if (parsed?.psychologyScale) return "SCALE";
  if (parsed?.psychologyNote) return "SESSION_NOTE";
  if (parsed?.psychologyAnamnesis) return "ANAMNESIS";
  return null;
}

async function main() {
  const batch = await prisma.medicalDocument.findMany({
    where: {
      type: "CLINICAL_NOTE",
      recordKind: "OTHER",
      content: { not: "" },
    },
    select: { id: true, content: true, recordKind: true },
    take: 5000,
  });

  let updated = 0;
  for (const doc of batch) {
    const kind = inferKind(safeDecrypt(doc.content));
    if (!kind || kind === doc.recordKind) continue;
    updated += 1;
    if (!dryRun) {
      await prisma.medicalDocument.update({
        where: { id: doc.id },
        data: { recordKind: kind },
      });
    }
  }

  console.log(
    `[backfill-psychology-record-kind] ${dryRun ? "DRY-RUN" : "APPLIED"} — ${updated} docs would update / updated`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
