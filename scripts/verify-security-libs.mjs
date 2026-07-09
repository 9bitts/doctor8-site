#!/usr/bin/env node
/**
 * Lightweight checks for security helper modules (no test runner required).
 *   node scripts/verify-security-libs.mjs
 */
import assert from "node:assert/strict";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const key = randomBytes(32);
process.env.ENCRYPTION_KEY = key.toString("hex");

function encrypt(plaintext) {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${cipher.getAuthTag().toString("hex")}:${encrypted}`;
}

function decrypt(stored) {
  const [ivHex, authTagHex, encrypted] = stored.split(":");
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  let out = decipher.update(encrypted, "hex", "utf8");
  out += decipher.final("utf8");
  return out;
}

function encryptPhiField(value) {
  if (value == null || value === "") return value;
  return encrypt(value);
}

function decryptPhiField(stored) {
  if (stored == null || stored === "") return stored;
  try {
    return decrypt(stored);
  } catch {
    return stored;
  }
}

function checkAnamnesisInviteAccess(invite) {
  if (invite.status === "COMPLETED") return { ok: false };
  if (invite.expiresAt < new Date()) return { ok: false };
  if (invite.viewCount >= invite.maxViews) return { ok: false };
  return { ok: true };
}

const MAX_CSV_IMPORT_BYTES = 5 * 1024 * 1024;

assert.equal(decryptPhiField(null), null);
const plain = "123.456.789-00";
const enc = encryptPhiField(plain);
assert.equal(decryptPhiField(enc), plain);
assert.equal(decryptPhiField(plain), plain);

const invite = {
  status: "PENDING",
  expiresAt: new Date(Date.now() + 60_000),
  viewCount: 0,
  maxViews: 5,
};
assert.equal(checkAnamnesisInviteAccess(invite).ok, true);
assert.equal(checkAnamnesisInviteAccess({ ...invite, viewCount: 5 }).ok, false);

assert.ok(5 * 1024 * 1024 + 1 > MAX_CSV_IMPORT_BYTES);

console.log("[verify-security-libs] OK");
