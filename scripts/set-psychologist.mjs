#!/usr/bin/env node
/**
 * Promote a patient (or incomplete) user to psychologist (PROFESSIONAL + specialty Psychologist).
 * Run on Railway with DATABASE_URL set.
 *
 *   node scripts/set-psychologist.mjs jeanamaia13@gmail.com
 *   node scripts/set-psychologist.mjs jeanamaia13@gmail.com --apply
 */
import { PrismaClient } from "@prisma/client";
import { createDecipheriv } from "crypto";

const prisma = new PrismaClient();

const emailArg = (process.argv[2] || "").trim();
const apply = process.argv.includes("--apply");

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

function namesFromEmail(email) {
  const local = (email.split("@")[0] || "User").replace(/[._+]/g, " ");
  const parts = local.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "Psicologo",
    lastName: parts.slice(1).join(" ") || "",
  };
}

async function findUser(email) {
  const normalized = email.toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: normalized },
    include: {
      patientProfile: true,
      professionalProfile: true,
    },
  });
  if (user) return user;

  const similar = await prisma.user.findMany({
    where: { email: { contains: normalized.split("@")[0], mode: "insensitive" } },
    take: 10,
    select: { email: true, role: true },
  });
  if (similar.length) {
    console.log("\nExact email not found. Similar accounts:");
    for (const row of similar) console.log(`  - ${row.email} (${row.role})`);
  }
  return null;
}

async function main() {
  if (!emailArg) {
    console.error("Usage: node scripts/set-psychologist.mjs <email> [--apply]");
    process.exit(1);
  }

  const user = await findUser(emailArg);
  if (!user) {
    console.log(`\nNOT FOUND: ${emailArg}`);
    process.exit(1);
  }

  const fromPatient = user.patientProfile
    ? {
        firstName: decrypt(user.patientProfile.firstName)?.trim() || "Psicologo",
        lastName: decrypt(user.patientProfile.lastName)?.trim() || "",
      }
    : namesFromEmail(user.email);

  const alreadyPsychologist =
    user.role === "PROFESSIONAL" &&
    user.professionalProfile?.specialty === "Psychologist";

  console.log(`\n--- ${user.email} ---`);
  console.log(`  id: ${user.id}`);
  console.log(`  role: ${user.role}`);
  console.log(`  patientProfile: ${user.patientProfile ? "yes" : "no"}`);
  console.log(`  professionalProfile: ${user.professionalProfile ? "yes" : "no"}`);
  if (user.professionalProfile) {
    console.log(`  specialty: "${user.professionalProfile.specialty}"`);
  }

  if (alreadyPsychologist) {
    console.log("\nAlready PROFESSIONAL with specialty Psychologist. Nothing to do.");
    return;
  }

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to:");
    console.log("  1. Set role = PROFESSIONAL");
    console.log("  2. Create/update ProfessionalProfile (specialty = Psychologist)");
    console.log("  3. Bump tokenVersion (forces re-login within ~1 min)");
    console.log(`\nProfile preview: ${fromPatient.firstName} ${fromPatient.lastName}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (user.professionalProfile) {
      await tx.professionalProfile.update({
        where: { userId: user.id },
        data: {
          specialty: "Psychologist",
          firstName: user.professionalProfile.firstName || fromPatient.firstName,
          lastName: user.professionalProfile.lastName || fromPatient.lastName,
        },
      });
    } else {
      await tx.professionalProfile.create({
        data: {
          userId: user.id,
          firstName: fromPatient.firstName,
          lastName: fromPatient.lastName,
          licenseNumber: "",
          specialty: "Psychologist",
          consultPrice: 0,
        },
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        role: "PROFESSIONAL",
        tokenVersion: { increment: 1 },
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
  });

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    include: { professionalProfile: true },
  });

  console.log("\n>> DONE");
  console.log(`  role: ${updated.role}`);
  console.log(`  tokenVersion: ${updated.tokenVersion}`);
  console.log(
    `  professional profile: ${updated.professionalProfile.firstName} ${updated.professionalProfile.lastName} (${updated.professionalProfile.specialty})`,
  );
  console.log("\nAsk the user to log out, wait 1 minute, and log in again.");
  console.log("They should land on /psychologist");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
