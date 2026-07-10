#!/usr/bin/env node
/**
 * Encrypts legacy plaintext OAuth tokens on Account (Google link).
 * Safe to re-run — skips values that already look encrypted.
 *
 *   node scripts/backfill-oauth-account-tokens.mjs
 *   node scripts/backfill-oauth-account-tokens.mjs --dry-run
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
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted}`;
}

function isEncrypted(stored) {
  if (!stored || !stored.includes(":")) return false;
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) return false;
  try {
    const [ivHex, authTagHex, encrypted] = parts;
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

async function main() {
  const accounts = await prisma.account.findMany({
    select: {
      id: true,
      provider: true,
      access_token: true,
      refresh_token: true,
      id_token: true,
    },
  });

  let updated = 0;
  for (const acc of accounts) {
    const data = {
      access_token: maybeEncrypt(acc.access_token),
      refresh_token: maybeEncrypt(acc.refresh_token),
      id_token: maybeEncrypt(acc.id_token),
    };
    const changed =
      data.access_token !== acc.access_token ||
      data.refresh_token !== acc.refresh_token ||
      data.id_token !== acc.id_token;
    if (!changed) continue;
    updated += 1;
    if (!dryRun) {
      await prisma.account.update({ where: { id: acc.id }, data });
    }
    console.log(`[backfill-oauth] ${acc.provider} account ${acc.id}${dryRun ? " (dry-run)" : ""}`);
  }

  console.log(`[backfill-oauth] ${updated} account(s)${dryRun ? " would be updated" : " updated"}`);
}

main()
  .catch((err) => {
    console.error("[backfill-oauth] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
