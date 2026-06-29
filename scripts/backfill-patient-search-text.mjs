#!/usr/bin/env node
/**
 * Backfill PatientRecord.searchText from encrypted name fields.
 * Run on Railway: node scripts/backfill-patient-search-text.mjs
 * Dry run: node scripts/backfill-patient-search-text.mjs --dry-run
 */
import { PrismaClient } from "@prisma/client";
import { createDecipheriv } from "crypto";

const prisma = new PrismaClient();
const dryRun = process.argv.includes("--dry-run");
const batchSize = 100;

function getKey() {
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be a 32-byte hex string");
  }
  return key;
}

function decrypt(ciphertext) {
  if (!ciphertext || !ciphertext.includes(":")) return ciphertext;
  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(authTag);
  let out = decipher.update(encrypted, "hex", "utf8");
  out += decipher.final("utf8");
  return out;
}

function normalizeSearchToken(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

function buildSearchText(firstName, lastName, email) {
  const parts = [
    normalizeSearchToken(firstName),
    normalizeSearchToken(lastName),
    email ? normalizeSearchToken(email) : "",
  ].filter(Boolean);
  return parts.join(" ");
}

async function main() {
  let cursor = undefined;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  console.log(dryRun ? "DRY RUN ? no writes" : "Backfilling PatientRecord.searchText...");

  for (;;) {
    const batch = await prisma.patientRecord.findMany({
      take: batchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, firstName: true, lastName: true, email: true, searchText: true },
    });
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    for (const r of batch) {
      try {
        const first = decrypt(r.firstName);
        const last = decrypt(r.lastName);
        const searchText = buildSearchText(first, last, r.email);
        if (r.searchText === searchText) {
          skipped++;
          continue;
        }
        if (!dryRun) {
          await prisma.patientRecord.update({
            where: { id: r.id },
            data: { searchText },
          });
        }
        updated++;
      } catch (e) {
        errors++;
        console.error(`  error on ${r.id}:`, e.message || e);
      }
    }
    process.stdout.write(`\r  processed ? updated=${updated} skipped=${skipped} errors=${errors}`);
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} errors=${errors}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
