#!/usr/bin/env node
/**
 * Promote a user to ANGEL (lay follow-up volunteer). Run on Railway with DATABASE_URL set.
 *
 *   node scripts/set-angel.mjs diegoalbs@hotmail.com
 *   node scripts/set-angel.mjs diegoalbs@hotmail.com --apply
 *   node scripts/set-angel.mjs diegoalbs@hotmail.com --apply --approve
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const VENEZUELA_CAMPAIGN_SLUG = "venezuela-terremoto-2026";

const emailArg = (process.argv[2] || "").trim();
const apply = process.argv.includes("--apply");
const approve = process.argv.includes("--approve");

function languagesFromUser(user) {
  const lang = (user.language || "pt").toLowerCase();
  if (lang.startsWith("en")) return ["en"];
  if (lang.startsWith("es")) return ["es"];
  return ["pt"];
}

function profileFromProfessional(pro) {
  if (!pro) return null;
  return {
    firstName: pro.firstName?.trim() || "Anjo",
    lastName: pro.lastName?.trim() || "Voluntario",
    phone: pro.phone,
    profession: pro.specialty?.trim() || "Profissional de saude",
    volunteerHelp: "Acompanhamento pos-consulta humanitaria",
    languages: languagesFromUser({ language: "pt" }),
    motivation: pro.bio?.trim() || null,
    preferredCampaignSlug: VENEZUELA_CAMPAIGN_SLUG,
  };
}

function profileFromPsychoanalyst(pro) {
  if (!pro) return null;
  return {
    firstName: pro.firstName?.trim() || "Anjo",
    lastName: pro.lastName?.trim() || "Voluntario",
    phone: pro.phone,
    profession: "Psicanalista",
    volunteerHelp: "Acompanhamento pos-consulta humanitaria",
    languages: languagesFromUser({ language: "pt" }),
    motivation: pro.bio?.trim() || null,
    preferredCampaignSlug: VENEZUELA_CAMPAIGN_SLUG,
  };
}

function profileFromIntegrative(pro) {
  if (!pro) return null;
  return {
    firstName: pro.firstName?.trim() || "Anjo",
    lastName: pro.lastName?.trim() || "Voluntario",
    phone: pro.phone,
    profession: pro.trainingInstitution?.trim() || "Terapeuta integrativo",
    volunteerHelp: "Acompanhamento pos-consulta humanitaria",
    languages: languagesFromUser({ language: "pt" }),
    motivation: pro.bio?.trim() || null,
    preferredCampaignSlug: VENEZUELA_CAMPAIGN_SLUG,
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
      angelProfile: true,
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
    console.error("Usage: node scripts/set-angel.mjs <email> [--apply] [--approve]");
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
  console.log(`  emailVerified: ${user.emailVerified ? user.emailVerified.toISOString() : "NO"}`);
  console.log(`  professionalProfile: ${user.professionalProfile ? "yes" : "no"}`);
  console.log(`  angelProfile: ${user.angelProfile ? `yes (${user.angelProfile.approvalStatus})` : "no"}`);

  if (user.role === "ANGEL" && user.angelProfile?.approvalStatus === "APPROVED" && !approve) {
    console.log("\nAlready ANGEL with APPROVED profile. Nothing to do.");
    console.log("Re-run with --approve if enrollment is missing.");
    return;
  }

  const fromPro = profileFromProfessional(user.professionalProfile);
  const fromPsy = profileFromPsychoanalyst(user.psychoanalystProfile);
  const fromIt = profileFromIntegrative(user.integrativeTherapistProfile);

  const profileData = fromPro || fromPsy || fromIt || (user.angelProfile
    ? {
        firstName: user.angelProfile.firstName,
        lastName: user.angelProfile.lastName,
        phone: user.angelProfile.phone,
        profession: user.angelProfile.profession || "Voluntario",
        volunteerHelp: user.angelProfile.volunteerHelp || "Acompanhamento pos-consulta",
        languages: user.angelProfile.languages?.length ? user.angelProfile.languages : languagesFromUser(user),
        motivation: user.angelProfile.motivation,
        preferredCampaignSlug: user.angelProfile.preferredCampaignSlug || VENEZUELA_CAMPAIGN_SLUG,
      }
    : {
        firstName: "Anjo",
        lastName: "Voluntario",
        profession: "Voluntario",
        volunteerHelp: "Acompanhamento pos-consulta humanitaria",
        languages: languagesFromUser(user),
        preferredCampaignSlug: VENEZUELA_CAMPAIGN_SLUG,
      });

  profileData.languages = languagesFromUser(user);

  const approvalStatus = approve ? "APPROVED" : (user.angelProfile?.approvalStatus || "PENDING");

  if (!apply) {
    console.log("\nDry run only. Re-run with --apply to:");
    console.log("  1. Set role = ANGEL");
    console.log("  2. Create/update AngelProfile");
    console.log("  3. Bump tokenVersion (forces re-login within ~1 min)");
    if (approve) {
      console.log("  4. Approve angel + enroll in campaign (with --approve)");
    } else {
      console.log("\nAdd --approve to also approve and enroll (full portal access).");
    }
    console.log(`\nProfile preview: ${profileData.firstName} ${profileData.lastName}`);
    console.log(`  profession: ${profileData.profession}`);
    console.log(`  approvalStatus: ${approvalStatus}`);
    if (!user.emailVerified) {
      console.log("\nWARNING: email not verified � angel portal will block until verified.");
    }
    return;
  }

  if (approve && !user.emailVerified) {
    console.error("\nERROR: email must be verified before --approve. Verify email first.");
    process.exit(1);
  }

  const campaign = approve
    ? await prisma.humanitarianCampaign.findUnique({
        where: { slug: VENEZUELA_CAMPAIGN_SLUG },
        select: { id: true },
      })
    : null;

  if (approve && !campaign) {
    console.error(`\nERROR: campaign not found: ${VENEZUELA_CAMPAIGN_SLUG}`);
    process.exit(1);
  }

  await prisma.$transaction(async (tx) => {
    const angelData = {
      ...profileData,
      approvalStatus,
      approvedAt: approve ? new Date() : null,
      approvedById: null,
      rejectionReason: null,
    };

    if (user.angelProfile) {
      await tx.angelProfile.update({
        where: { userId: user.id },
        data: angelData,
      });
    } else {
      await tx.angelProfile.create({
        data: { userId: user.id, ...angelData },
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        role: "ANGEL",
        tokenVersion: { increment: 1 },
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    if (approve && campaign) {
      await tx.humanitarianAngel.upsert({
        where: {
          campaignId_userId: { campaignId: campaign.id, userId: user.id },
        },
        create: {
          campaignId: campaign.id,
          userId: user.id,
          active: true,
        },
        update: { active: true },
      });
    }
  });

  const updated = await prisma.user.findUnique({
    where: { id: user.id },
    include: {
      angelProfile: true,
      humanitarianAngels: { select: { active: true, campaign: { select: { slug: true } } } },
    },
  });

  console.log("\n>> DONE");
  console.log(`  role: ${updated.role}`);
  console.log(`  tokenVersion: ${updated.tokenVersion}`);
  console.log(
    `  angel profile: ${updated.angelProfile.firstName} ${updated.angelProfile.lastName} (${updated.angelProfile.approvalStatus})`,
  );
  if (approve) {
    const enrolled = updated.humanitarianAngels.some((e) => e.active);
    console.log(`  enrolled: ${enrolled ? "yes" : "no"}`);
  }
  console.log("\nAsk the user to log out, wait 1 minute, and log in again.");
  console.log("They should land on /humanitarian/angel");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
