#!/usr/bin/env node
/**
 * Probe Meta WhatsApp Cloud API credentials from env.
 * Usage: node --env-file=.env scripts/whatsapp-probe.mjs
 *    or: WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... node scripts/whatsapp-probe.mjs
 */

const version = process.env.WHATSAPP_GRAPH_API_VERSION?.trim() || "v25.0";
const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();

if (!token) {
  console.error("Missing WHATSAPP_ACCESS_TOKEN");
  process.exit(1);
}

if (!phoneNumberId) {
  console.error("Missing WHATSAPP_PHONE_NUMBER_ID");
  process.exit(1);
}

const url = `https://graph.facebook.com/${version}/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating`;
const res = await fetch(url, {
  headers: { Authorization: `Bearer ${token}` },
});
const data = await res.json();

if (!res.ok) {
  console.error("Probe failed:", data.error?.message || `HTTP ${res.status}`);
  process.exit(1);
}

console.log("WhatsApp probe OK");
console.log(`  Graph API: ${version}`);
console.log(`  Phone ID:  ${phoneNumberId}`);
console.log(`  Name:      ${data.verified_name || "(unknown)"}`);
console.log(`  Number:    ${data.display_phone_number || "(unknown)"}`);
if (data.quality_rating) console.log(`  Quality:   ${data.quality_rating}`);
