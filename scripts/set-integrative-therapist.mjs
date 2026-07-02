#!/usr/bin/env node
/**
 * Promote a provider user to integrative therapist (run on Railway with DATABASE_URL set).
 *
 *   node scripts/set-integrative-therapist.mjs celesthina1808@gmail.com
 *   node scripts/set-integrative-therapist.mjs celesthina1808@gmail.com --apply
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const emailArg = (process.argv[2] || "").trim();
const apply = process.argv.includes("--apply");

function profileFromProfessional(pro) {
  if (!pro) return null;
  return {
    firstName: pro.firstName?.trim() || "Terapeuta",
    lastName: pro.lastName?.trim() || "Integrativo",
    avatarUrl: pro.avatarUrl,
    phone: pro.phone,
    trainingInstitution: pro.specialty?.trim() || "",
    bio: pro.bio,
    clinicName: pro.clinicName,
    clinicAddress: pro.clinicAddress,
    clinicCity: pro.clinicCity,
    clinicState: pro.clinicState,
    clinicCountry: pro.clinicCountry,
    clinicZip: pro.clinicZip,
    clinicLatitude: pro.clinicLatitude,
    clinicLongitude: pro.clinicLongitude,
    acceptsTeleconsult: pro.acceptsTeleconsult,
    acceptsInPerson: pro.acceptsInPerson,
    consultPrice: pro.consultPrice ?? 0,
    currency: pro.currency || "BRL",
    availability: pro.availability,
    verified: pro.verified,
    verifiedAt: pro.verifiedAt,
    verifiedBy: pro.verifiedBy,
    acuraVolunteer: pro.acuraVolunteer,
  };
}

async function findUser(email) {
  const normalized = email.toLowerCase();
  let user = await prisma.user.findUnique({
    where: { email: normalized },
    include: {
      professionalProfile: true,
      psychoanalystProfile: true,
      integrativeTherapistProfile: true,
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
    console.error("Usage: node scripts/set-integrative-therapist.mjs <email> [--apply]");
    process.exit(1);
  }

  const user = await findUser(emailArg);
  if (!user) {
    console.log(`\nNOT FOUND: ${emailArg}`);
    process.exit(1);
  }

  console.log(`\n--- ${user.email} ---`);
  console.log(`  id: ${user.id}`);
  console.log(`  role: ${user.role}`);
  console.log(`  professionalProfile: ${user.professionalProfile ? "yes" : "no"}`);
  console.log(`  integrativeTherapistProfile: ${user.integrativeTherapistProfile ? "yes" : "no"}`);

  if (user.role === "INTEGRATIVE_THERAPIST" && user.integrativeTherapistProfile) {
    console.log("\nAlready INTEGRATIVE_THERAPIST with profile. Nothing to do.");
    return;
  }

  const fromPro = profileFromProfessional(user.professionalProfile);
  const fromPsy = user.psychoanalystProfile
    ? {
        firstName: user.psychoanalystProfile.firstName,
        lastName: user.psychoanalystProfile.lastName,
        avatarUrl: user.psychoanalystProfile.avatarUrl,
        phone: user.psychoanalystProfile.phone,
        trainingInstitution: user.psychoanalystProfile.trainingInstitution || "",
        bio: user.psychoanalystProfile.bio,
        clinicName: user.psychoanalystProfile.clinicName,
        clinicAddress: user.psychoanalystProfile.clinicAddress,
        clinicCity: user.psychoanalystProfile.clinicCity,
        clinicState: user.psychoanalystProfile.clinicState,
        clinicCountry: user.psychoanalystProfile.clinicCountry,
        clinicZip: user.psychoanalystProfile.clinicZip,
        clinicLatitude: user.psychoanalystProfile.clinicLatitude,
        clinicLongitude: user.psychoanalystProfile.clinicLongitude,
        acceptsTeleconsult: user.psychoanalystProfile.acceptsTeleconsult,
        acceptsInPerson: user.psychoanalystProfile.acceptsInPerson,
        consultPrice: user.psychoanalystProfile.consultPrice ?? 0,
        currency: user.psychoanalystProfile.currency || "BRL",
        availability: user.psychoanalystProfile.availability,
        verified: user.psychoanalystProfile.verified,
        verifiedAt: user.psychoanalystProfile.verifiedAt,
        verifiedBy: user.psychoanalystProfile.verifiedBy,
        acuraVolunteer: user.psychoanalystProfile.acuraVolunteer,
      }
    : null;

  const profileData = fromPro || fromPsy || {
    firstName: "Terapeuta",
    lastName: "Integrativo",
    trainingInstitution: "",
    consultPrice: 0,
    currency: "BRL",
  };

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to:");
    console.log("  1. Set role = INTEGRATIVE_THERAPIST");
    console.log("  2. Create/update IntegrativeTherapistProfile");
    console.log("  3. Bump tokenVersion (forces re-login within ~1 min)");
    console.log(`\nProfile preview: ${profileData.firstName} ${profileData.lastName}`);
    return;
  }

  await prisma.$transaction(async (tx) => {
    if (user.integrativeTherapistProfile) {
      await tx.integrativeTherapistProfile.update({
        where: { userId: user.id },
        data: profileData,
      });
    } else {
      await tx.integrativeTherapistProfile.create({
        data: { userId: user.id, ...profileData },
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        role: "INTEGRATIVE_THERAPIST",
        tokenVersion: { increment: 1 },
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });
  });

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    include: { integrativeTherapistProfile: true },
  });

  console.log("\n>> DONE");
  console.log(`  role: ${updated.role}`);
  console.log(`  tokenVersion: ${updated.tokenVersion}`);
  console.log(
    `  integrative profile: ${updated.integrativeTherapistProfile.firstName} ${updated.integrativeTherapistProfile.lastName}`,
  );
  console.log("\nAsk the user to log out, wait 1 minute, and log in again.");
  console.log("They should land on /integrative-therapist");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
