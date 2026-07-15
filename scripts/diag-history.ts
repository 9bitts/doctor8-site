#!/usr/bin/env npx tsx
/**
 * Read-only diagnostic for PatientProfile.notes / chronicConditions and history-share stubs.
 *
 * Uso (prod):
 *   DATABASE_URL=... ENCRYPTION_KEY=... npx tsx scripts/diag-history.ts
 *
 * Output: counts + sample IDs only — never logs PHI.
 * This script performs no writes.
 */
import { PrismaClient } from "@prisma/client";
import { decrypt, looksLikeEncryptedPayload } from "../src/lib/encryption";

const db = new PrismaClient();

type BucketIds = { total: number; sampleIds: string[] };

function bump(bucket: BucketIds, id: string) {
  bucket.total += 1;
  if (bucket.sampleIds.length < 3) bucket.sampleIds.push(id);
}

function printBucket(label: string, b: BucketIds) {
  console.log(`  ${label}: ${b.total}${b.sampleIds.length ? `  ids=[${b.sampleIds.join(", ")}]` : ""}`);
}

function tryDecrypt(raw: string): { ok: true; value: string } | { ok: false; reason: "decrypt_throws" } {
  try {
    return { ok: true, value: decrypt(raw) };
  } catch {
    return { ok: false, reason: "decrypt_throws" };
  }
}

function splitCommaList(s: string): string[] {
  return s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }
  if (!process.env.ENCRYPTION_KEY) {
    console.error("ENCRYPTION_KEY is required (same key as prod or decrypt stats are meaningless)");
    process.exit(1);
  }

  console.log("=== (a) PatientProfile.notes (non-null) ===");
  const notesBuckets = {
    decrypt_throws: { total: 0, sampleIds: [] as string[] },
    parse_throws: { total: 0, sampleIds: [] as string[] },
    plaintext_legacy: { total: 0, sampleIds: [] as string[] },
    ok: { total: 0, sampleIds: [] as string[] },
  };

  const notesRows = await db.patientProfile.findMany({
    where: { notes: { not: null } },
    select: { id: true, notes: true },
  });

  type NotesOk = { id: string; parsed: Record<string, unknown> };
  const notesOk: NotesOk[] = [];

  for (const row of notesRows) {
    const raw = row.notes!;
    if (!looksLikeEncryptedPayload(raw)) {
      bump(notesBuckets.plaintext_legacy, row.id);
      continue;
    }
    const dec = tryDecrypt(raw);
    if (!dec.ok) {
      bump(notesBuckets.decrypt_throws, row.id);
      continue;
    }
    try {
      const parsed = JSON.parse(dec.value) as Record<string, unknown>;
      bump(notesBuckets.ok, row.id);
      notesOk.push({ id: row.id, parsed });
    } catch {
      bump(notesBuckets.parse_throws, row.id);
    }
  }

  console.log(`  scanned_non_null: ${notesRows.length}`);
  printBucket("decrypt_throws", notesBuckets.decrypt_throws);
  printBucket("parse_throws", notesBuckets.parse_throws);
  printBucket("plaintext_legacy", notesBuckets.plaintext_legacy);
  printBucket("ok", notesBuckets.ok);

  console.log("\n=== (b) PatientProfile.chronicConditions (column) ===");
  const colBuckets = {
    null: 0,
    decrypt_throws: 0,
    post_decrypt_json_array: 0,
    post_decrypt_simple_string: 0,
  };

  const colRows = await db.patientProfile.findMany({
    select: { id: true, chronicConditions: true },
  });

  for (const row of colRows) {
    if (row.chronicConditions == null || row.chronicConditions === "") {
      colBuckets.null += 1;
      continue;
    }
    const dec = tryDecrypt(row.chronicConditions);
    if (!dec.ok) {
      colBuckets.decrypt_throws += 1;
      continue;
    }
    const trimmed = dec.value.trim();
    if (trimmed.startsWith("[")) {
      try {
        const arr = JSON.parse(trimmed);
        if (Array.isArray(arr)) {
          colBuckets.post_decrypt_json_array += 1;
          continue;
        }
      } catch {
        /* fall through to simple string */
      }
    }
    colBuckets.post_decrypt_simple_string += 1;
  }

  console.log(`  scanned_profiles: ${colRows.length}`);
  console.log(`  null: ${colBuckets.null}`);
  console.log(`  decrypt_throws: ${colBuckets.decrypt_throws}`);
  console.log(`  post_decrypt_json_array: ${colBuckets.post_decrypt_json_array}`);
  console.log(`  post_decrypt_simple_string: ${colBuckets.post_decrypt_simple_string}`);

  console.log("\n=== (b2) notes.ok → chronicConditions shape ===");
  let notesCcArray = 0;
  let notesCcString = 0;
  let notesCcAbsent = 0;
  for (const { parsed } of notesOk) {
    const cc = parsed.chronicConditions;
    if (Array.isArray(cc)) notesCcArray += 1;
    else if (typeof cc === "string") notesCcString += 1;
    else notesCcAbsent += 1;
  }
  console.log(`  notes_ok_total: ${notesOk.length}`);
  console.log(`  chronicConditions_array: ${notesCcArray}`);
  console.log(`  chronicConditions_string: ${notesCcString}`);
  console.log(`  chronicConditions_absent: ${notesCcAbsent}`);

  console.log('\n=== (b3) notes.array entries containing ", " in a single label ===');
  const commaInLabel: BucketIds = { total: 0, sampleIds: [] };
  for (const { id, parsed } of notesOk) {
    const cc = parsed.chronicConditions;
    if (!Array.isArray(cc)) continue;
    const hit = cc.some((item) => typeof item === "string" && item.includes(", "));
    if (hit) bump(commaInLabel, id);
  }
  printBucket('has_label_with_", "', commaInLabel);

  console.log("\n=== (c) SharedRecord → MedicalDocument stub vs other ===");
  const shareTotal = await db.sharedRecord.count();
  const stubShares = await db.sharedRecord.count({
    where: {
      document: {
        title: "Medical History",
        content: "Patient medical history export",
      },
    },
  });
  console.log(`  SharedRecord_total: ${shareTotal}`);
  console.log(`  stub_Medical_History_export: ${stubShares}`);
  console.log(`  other_document: ${shareTotal - stubShares}`);
}

main()
  .catch((e) => {
    console.error("[diag-history] failed:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
