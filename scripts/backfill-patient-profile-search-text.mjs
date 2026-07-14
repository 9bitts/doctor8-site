#!/usr/bin/env node
/**
 * Backfill PatientProfile.searchText from encrypted name/phone + user email.
 * Run: node scripts/backfill-patient-profile-search-text.mjs
 * Dry run: node scripts/backfill-patient-profile-search-text.mjs --dry-run
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

function buildSearchText(firstName, lastName, email, phone) {
  const parts = [
    normalizeSearchToken(firstName),
    normalizeSearchToken(lastName),
    email ? normalizeSearchToken(email) : "",
    phone ? normalizeSearchToken(phone.replace(/\D/g, "")) : "",
  ].filter(Boolean);
  return parts.join(" ");
}

async function main() {
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  let pending = 0;
  try {
    pending = await prisma.patientProfile.count({ where: { searchText: null } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("searchText") || msg.includes("does not exist")) {
      console.log("PatientProfile.searchText not available yet — run prisma migrate deploy first.");
      return;
    }
    throw err;
  }

  if (pending === 0) {
    console.log("PatientProfile.searchText already backfilled.");
    return;
  }

  console.log(
    dryRun
      ? `DRY RUN — would backfill ${pending} PatientProfile row(s)`
      : `Backfilling PatientProfile.searchText for ${pending} row(s)...`,
  );

  for (;;) {
    const batch = await prisma.patientProfile.findMany({
      where: { searchText: null },
      take: batchSize,
      orderBy: { id: "asc" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        searchText: true,
        user: { select: { email: true } },
      },
    });
    if (batch.length === 0) break;

    for (const p of batch) {
      try {
        const first = decrypt(p.firstName);
        const last = decrypt(p.lastName);
        const phone = p.phone ? decrypt(p.phone) : null;
        const searchText = buildSearchText(first, last, p.user?.email ?? null, phone);
        if (p.searchText === searchText) {
          skipped++;
          continue;
        }
        if (!dryRun) {
          await prisma.patientProfile.update({
            where: { id: p.id },
            data: { searchText },
          });
        }
        updated++;
      } catch (err) {
        errors++;
        console.error(`Error on ${p.id}:`, err.message);
      }
    }
  }

  console.log({ updated, skipped, errors, dryRun });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
