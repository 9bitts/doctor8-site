#!/usr/bin/env node
/**
 * Seeds verified E2E test users + Venezuela humanitarian campaign.
 * Safe to re-run (upsert). Used in CI and locally before authenticated Playwright tests.
 *
 *   node scripts/seed-e2e.mjs
 */
import { createCipheriv, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient, UserRole, UserRegion, ConsentType, ProviderType } from "@prisma/client";

const prisma = new PrismaClient();

const VENEZUELA_SLUG = "venezuela-terremoto-2026";

const DEFAULT_PATIENT = {
  email: process.env.E2E_PATIENT_EMAIL || "e2e-patient@doctor8.test",
  password: process.env.E2E_PATIENT_PASSWORD || "TestPassword1!",
  firstName: "E2E",
  lastName: "Patient",
};

const POOLS = [
  { slug: "medico", labelEs: "M\u00e9dico general", labelPt: "M\u00e9dico cl\u00ednico", labelEn: "General physician", maxWaiting: 500, sortOrder: 1 },
  { slug: "psicologo", labelEs: "Psic\u00f3logo", labelPt: "Psic\u00f3logo", labelEn: "Psychologist", maxWaiting: 200, sortOrder: 2 },
];

const DEFAULT_QUEUE_PATIENT = {
  email: process.env.E2E_QUEUE_PATIENT_EMAIL || "e2e-queue-patient@doctor8.test",
  password: process.env.E2E_QUEUE_PATIENT_PASSWORD || "TestPassword1!",
  firstName: "E2E",
  lastName: "Queue",
};

const E2E_QUEUE_PHONE = "+584121234567";

const DEFAULT_PROFESSIONAL = {
  email: process.env.E2E_PROFESSIONAL_EMAIL || "e2e-volunteer@doctor8.test",
  password: process.env.E2E_PROFESSIONAL_PASSWORD || "TestPassword1!",
  firstName: "E2E",
  lastName: "Volunteer",
};

function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  const key = Buffer.from(process.env.ENCRYPTION_KEY || "", "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32-byte hex (openssl rand -hex 32)");
  }
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

async function seedCampaign() {
  const campaign = await prisma.humanitarianCampaign.upsert({
    where: { slug: VENEZUELA_SLUG },
    create: {
      slug: VENEZUELA_SLUG,
      name: "SOS Venezuela E2E",
      description: "Campaign for automated E2E tests",
      region: "VE",
      active: true,
      noShowTimeoutSeconds: 180,
      estimatedMinutesPerPatient: 15,
    },
    update: {
      active: true,
      region: "VE",
    },
  });

  for (const p of POOLS) {
    await prisma.humanitarianPool.upsert({
      where: { campaignId_slug: { campaignId: campaign.id, slug: p.slug } },
      create: { campaignId: campaign.id, ...p },
      update: { ...p },
    });
  }

  console.log(`[seed-e2e] Campaign ${VENEZUELA_SLUG} ready`);
}

async function seedPatient({ email, password, firstName, lastName, phone }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const normalized = email.toLowerCase();

  const user = await prisma.user.upsert({
    where: { email: normalized },
    create: {
      email: normalized,
      passwordHash,
      role: UserRole.PATIENT,
      region: UserRegion.VE,
      language: "es",
      emailVerified: new Date(),
    },
    update: {
      passwordHash,
      role: UserRole.PATIENT,
      region: UserRegion.VE,
      emailVerified: new Date(),
      deletedAt: null,
      lockedUntil: null,
      failedLoginAttempts: 0,
    },
  });

  await prisma.patientProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      firstName: encrypt(firstName),
      lastName: encrypt(lastName),
      ...(phone ? { phone: encrypt(phone) } : {}),
    },
    update: {
      firstName: encrypt(firstName),
      lastName: encrypt(lastName),
      ...(phone ? { phone: encrypt(phone) } : {}),
    },
  });

  for (const type of [ConsentType.TERMS_OF_SERVICE, ConsentType.PRIVACY_POLICY]) {
    const existing = await prisma.consent.findFirst({
      where: { userId: user.id, type },
    });
    if (!existing) {
      await prisma.consent.create({
        data: {
          userId: user.id,
          type,
          version: "1.0",
          granted: true,
          ipAddress: "127.0.0.1",
          userAgent: "seed-e2e",
        },
      });
    }
  }

  console.log(`[seed-e2e] Patient ${normalized} ready`);
}

async function seedProfessional({ email, password, firstName, lastName }) {
  const passwordHash = await bcrypt.hash(password, 12);
  const normalized = email.toLowerCase();

  const user = await prisma.user.upsert({
    where: { email: normalized },
    create: {
      email: normalized,
      passwordHash,
      role: UserRole.PROFESSIONAL,
      region: UserRegion.VE,
      language: "es",
      emailVerified: new Date(),
    },
    update: {
      passwordHash,
      role: UserRole.PROFESSIONAL,
      region: UserRegion.VE,
      emailVerified: new Date(),
      deletedAt: null,
      lockedUntil: null,
      failedLoginAttempts: 0,
    },
  });

  await prisma.professionalProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      firstName,
      lastName,
      licenseNumber: "E2E-0001",
      licenseCountry: "VE",
      specialty: "general",
      verified: true,
      verifiedAt: new Date(),
      verifiedBy: "seed-e2e",
    },
    update: {
      firstName,
      lastName,
      verified: true,
      verifiedAt: new Date(),
      verifiedBy: "seed-e2e",
    },
  });

  for (const type of [ConsentType.TERMS_OF_SERVICE, ConsentType.PRIVACY_POLICY]) {
    const existing = await prisma.consent.findFirst({
      where: { userId: user.id, type },
    });
    if (!existing) {
      await prisma.consent.create({
        data: {
          userId: user.id,
          type,
          version: "1.0",
          granted: true,
          ipAddress: "127.0.0.1",
          userAgent: "seed-e2e",
        },
      });
    }
  }

  console.log(`[seed-e2e] Professional ${normalized} ready (verified)`);
}

const TELEMEDICINE_TCLE_VERSION = "1.2";
const E2E_MEETING_ROOM = "e2e-hum-room";
const E2E_MEETING_URL = "https://doctor8.daily.co/e2e-hum-room";

async function seedHumanitarianVideoFixtures() {
  const campaign = await prisma.humanitarianCampaign.findUnique({
    where: { slug: VENEZUELA_SLUG },
    select: { id: true },
  });
  if (!campaign) throw new Error("Campaign missing ? run seedCampaign first");

  const pool = await prisma.humanitarianPool.findFirst({
    where: { campaignId: campaign.id, slug: "medico" },
    select: { id: true },
  });
  if (!pool) throw new Error("Pool missing");

  const patient = await prisma.user.findUnique({
    where: { email: DEFAULT_PATIENT.email.toLowerCase() },
    select: { id: true },
  });
  const proUser = await prisma.user.findUnique({
    where: { email: DEFAULT_PROFESSIONAL.email.toLowerCase() },
    select: { id: true },
  });
  const proProfile = await prisma.professionalProfile.findUnique({
    where: { userId: proUser.id },
    select: { id: true },
  });
  if (!patient || !proUser || !proProfile) {
    throw new Error("E2E users missing ? seed patient/professional first");
  }

  await prisma.consent.upsert({
    where: {
      userId_type_version: {
        userId: patient.id,
        type: ConsentType.TELEMEDICINE_TCLE,
        version: TELEMEDICINE_TCLE_VERSION,
      },
    },
    create: {
      userId: patient.id,
      type: ConsentType.TELEMEDICINE_TCLE,
      version: TELEMEDICINE_TCLE_VERSION,
      granted: true,
      grantedAt: new Date(),
      ipAddress: "127.0.0.1",
      userAgent: "seed-e2e",
    },
    update: { granted: true, revokedAt: null, grantedAt: new Date() },
  });

  const intake = await prisma.humanitarianIntake.upsert({
    where: {
      campaignId_patientUserId: { campaignId: campaign.id, patientUserId: patient.id },
    },
    create: {
      campaignId: campaign.id,
      patientUserId: patient.id,
      status: "COMPLETE",
      triageCompletedAt: new Date(),
      telemedicineTcleAt: new Date(),
      telemedicineTcleVersion: TELEMEDICINE_TCLE_VERSION,
      consentAt: new Date(),
    },
    update: {
      status: "COMPLETE",
      triageCompletedAt: new Date(),
      telemedicineTcleAt: new Date(),
      telemedicineTcleVersion: TELEMEDICINE_TCLE_VERSION,
    },
  });

  const volunteer = await prisma.humanitarianVolunteer.upsert({
    where: {
      campaignId_userId_poolId: {
        campaignId: campaign.id,
        userId: proUser.id,
        poolId: pool.id,
      },
    },
    create: {
      campaignId: campaign.id,
      poolId: pool.id,
      userId: proUser.id,
      providerType: ProviderType.HEALTH,
      professionalId: proProfile.id,
      status: "OFFLINE",
    },
    update: {
      providerType: ProviderType.HEALTH,
      professionalId: proProfile.id,
      status: "OFFLINE",
    },
  });

  await prisma.humanitarianQueueEntry.deleteMany({
    where: { patientUserId: patient.id, campaignId: campaign.id },
  });

  await prisma.humanitarianQueueEntry.create({
    data: {
      campaignId: campaign.id,
      poolId: pool.id,
      patientUserId: patient.id,
      intakeId: intake.id,
      volunteerId: volunteer.id,
      status: "CALLED",
      priority: "ROUTINE",
      position: 1,
      chiefComplaint: "E2E humanitarian video fixture",
      calledAt: new Date(),
      expiresAt: new Date(Date.now() + 180_000),
      meetingUrl: E2E_MEETING_URL,
      meetingRoomId: E2E_MEETING_ROOM,
    },
  });

  console.log("[seed-e2e] Humanitarian CALLED queue entry ready for video E2E");
}

async function seedHumanitarianQueueFixtures() {
  const campaign = await prisma.humanitarianCampaign.findUnique({
    where: { slug: VENEZUELA_SLUG },
    select: { id: true },
  });
  if (!campaign) throw new Error("Campaign missing ? run seedCampaign first");

  await seedPatient({ ...DEFAULT_QUEUE_PATIENT, phone: E2E_QUEUE_PHONE });

  const patient = await prisma.user.findUnique({
    where: { email: DEFAULT_QUEUE_PATIENT.email.toLowerCase() },
    select: { id: true },
  });
  if (!patient) throw new Error("Queue patient missing");

  await prisma.consent.upsert({
    where: {
      userId_type_version: {
        userId: patient.id,
        type: ConsentType.TELEMEDICINE_TCLE,
        version: TELEMEDICINE_TCLE_VERSION,
      },
    },
    create: {
      userId: patient.id,
      type: ConsentType.TELEMEDICINE_TCLE,
      version: TELEMEDICINE_TCLE_VERSION,
      granted: true,
      grantedAt: new Date(),
      ipAddress: "127.0.0.1",
      userAgent: "seed-e2e",
    },
    update: { granted: true, revokedAt: null, grantedAt: new Date() },
  });

  await prisma.humanitarianIntake.upsert({
    where: {
      campaignId_patientUserId: { campaignId: campaign.id, patientUserId: patient.id },
    },
    create: {
      campaignId: campaign.id,
      patientUserId: patient.id,
      status: "COMPLETE",
      triageCompletedAt: new Date(),
      computedPriority: "ROUTINE",
      telemedicineTcleAt: new Date(),
      telemedicineTcleVersion: TELEMEDICINE_TCLE_VERSION,
      consentAt: new Date(),
    },
    update: {
      status: "COMPLETE",
      triageCompletedAt: new Date(),
      computedPriority: "ROUTINE",
      telemedicineTcleAt: new Date(),
      telemedicineTcleVersion: TELEMEDICINE_TCLE_VERSION,
    },
  });

  await prisma.humanitarianQueueEntry.deleteMany({
    where: { patientUserId: patient.id, campaignId: campaign.id },
  });

  console.log("[seed-e2e] Queue patient ready (intake complete, no queue entry)");
}

async function main() {
  await seedCampaign();
  await seedPatient(DEFAULT_PATIENT);
  await seedProfessional(DEFAULT_PROFESSIONAL);
  await seedHumanitarianVideoFixtures();
  await seedHumanitarianQueueFixtures();
}

main()
  .catch((err) => {
    console.error("[seed-e2e] Failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
