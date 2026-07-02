#!/usr/bin/env node
/**
 * List or repair professional accounts missing their profile row
 * (same set as Admin -> Profissionais -> Cadastros incompletos).
 *
 * Dry-run (default):
 *   node scripts/fix-incomplete-professional-signups.mjs
 *   node scripts/fix-incomplete-professional-signups.mjs --email=dmzalves@gmail.com
 *
 * Apply fixes (creates missing profile in a transaction):
 *   node scripts/fix-incomplete-professional-signups.mjs --apply
 *   node scripts/fix-incomplete-professional-signups.mjs --apply --email=dmzalves@gmail.com
 *
 * Run on Railway shell with DATABASE_URL set.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PROFESSIONAL_ROLES = ["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"];

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const emailArg = args.find((a) => a.startsWith("--email="));
const limitArg = args.find((a) => a.startsWith("--limit="));
const singleEmail = emailArg ? emailArg.split("=")[1]?.trim().toLowerCase() : null;
const limit = limitArg ? Math.max(1, parseInt(limitArg.split("=")[1], 10) || 0) : null;

function namesFromEmail(email) {
  const local = (email.split("@")[0] || "User").replace(/[._+]/g, " ");
  const parts = local.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "User",
    lastName: parts.slice(1).join(" ") || "",
  };
}

function hasProfileForRole(user) {
  switch (user.role) {
    case "PROFESSIONAL":
      return Boolean(user.professionalProfile);
    case "PSYCHOANALYST":
      return Boolean(user.psychoanalystProfile);
    case "INTEGRATIVE_THERAPIST":
      return Boolean(user.integrativeTherapistProfile);
    default:
      return true;
  }
}

async function loadIncompleteUsers() {
  const where = {
    deletedAt: null,
    OR: [
      { role: "PROFESSIONAL", professionalProfile: null },
      { role: "PSYCHOANALYST", psychoanalystProfile: null },
      { role: "INTEGRATIVE_THERAPIST", integrativeTherapistProfile: null },
    ],
    ...(singleEmail ? { email: singleEmail } : {}),
  };

  return prisma.user.findMany({
    where,
    orderBy: { createdAt: "asc" },
    ...(limit ? { take: limit } : {}),
    include: {
      professionalProfile: { select: { id: true } },
      psychoanalystProfile: { select: { id: true } },
      integrativeTherapistProfile: { select: { id: true } },
      patientProfile: { select: { id: true } },
      accounts: { select: { provider: true } },
    },
  });
}

async function createMissingProfile(user) {
  const { firstName, lastName } = namesFromEmail(user.email);

  await prisma.$transaction(async (tx) => {
    if (user.role === "PROFESSIONAL") {
      await tx.professionalProfile.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          licenseNumber: "",
          specialty: "",
          consultPrice: 0,
        },
      });
    } else if (user.role === "PSYCHOANALYST") {
      await tx.psychoanalystProfile.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          trainingInstitution: "",
          consultPrice: 0,
        },
      });
    } else if (user.role === "INTEGRATIVE_THERAPIST") {
      await tx.integrativeTherapistProfile.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          trainingInstitution: "",
          consultPrice: 0,
        },
      });
    } else {
      throw new Error(`Unsupported role: ${user.role}`);
    }
  });

  return { firstName, lastName };
}

async function main() {
  const users = await loadIncompleteUsers();

  if (singleEmail && users.length === 0) {
    console.log(`\nNo incomplete professional signup found for: ${singleEmail}`);
    console.log("Either the email is wrong, already fixed, or the account has a different issue.");
    console.log("Try: node scripts/inspect-provider-email.mjs " + singleEmail);
    return;
  }

  console.log(`\nIncomplete professional signups: ${users.length}`);
  console.log(`Mode: ${apply ? "APPLY (will write to DB)" : "DRY-RUN (read only)"}`);
  if (limit) console.log(`Limit: ${limit}`);
  console.log("");

  let fixed = 0;
  let skipped = 0;
  let failed = 0;

  for (const user of users) {
    const hasGoogle = user.accounts.some((a) => a.provider === "google");
    const verified = Boolean(user.emailVerified || user.phoneVerified);
    const hasPassword = Boolean(user.passwordHash);

    if (!PROFESSIONAL_ROLES.includes(user.role)) {
      console.log(`SKIP ${user.email} - unexpected role ${user.role}`);
      skipped++;
      continue;
    }

    if (hasProfileForRole(user)) {
      console.log(`SKIP ${user.email} - profile already exists`);
      skipped++;
      continue;
    }

    console.log(`--- ${user.email}`);
    console.log(`  id: ${user.id}`);
    console.log(`  role: ${user.role}`);
    console.log(`  created: ${user.createdAt.toISOString()}`);
    console.log(`  verified: ${verified ? "yes" : "no"}`);
    console.log(`  password: ${hasPassword ? "yes" : "no"}`);
    console.log(`  google: ${hasGoogle ? "yes" : "no"}`);
    if (user.patientProfile) {
      console.log(`  note: also has patientProfile (unusual for this query)`);
    }

    if (!apply) {
      const { firstName, lastName } = namesFromEmail(user.email);
      console.log(`  would create profile: ${firstName} ${lastName || "(no last name)"}`);
      continue;
    }

    try {
      const { firstName, lastName } = await createMissingProfile(user);
      console.log(`  FIXED: created ${user.role} profile for ${firstName} ${lastName || "(no last name)"}`);
      fixed++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`  FAILED: ${msg}`);
      failed++;
    }
  }

  console.log("\n=== Summary ===");
  if (apply) {
    console.log(`  fixed: ${fixed}`);
    console.log(`  skipped: ${skipped}`);
    console.log(`  failed: ${failed}`);
  } else {
    console.log(`  would fix: ${users.filter((u) => PROFESSIONAL_ROLES.includes(u.role) && !hasProfileForRole(u)).length}`);
    console.log("  Run with --apply to create missing profiles.");
  }

  if (!apply && users.length > 0) {
    console.log("\nAfter --apply, users can:");
    console.log("  - login with Google (if linked), or");
    console.log("  - login with email/password (if set + verified), then complete data in settings.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
