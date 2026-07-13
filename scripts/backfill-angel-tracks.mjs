import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function envFlag(name, defaultValue = false) {
  const raw = (process.env[name] || "").trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes";
}

const APPLY = envFlag("APPLY", false);

async function main() {
  const now = new Date();
  const approved = await prisma.angelProfile.findMany({
    where: { approvalStatus: "APPROVED" },
    select: { id: true, userId: true },
  });

  console.log(`[backfill-angel-tracks] approved profiles: ${approved.length}`);

  if (!APPLY) {
    console.log("[backfill-angel-tracks] Dry-run. Set APPLY=true to apply changes.");
    return;
  }

  let createdEnrollments = 0;
  let createdExemptions = 0;

  for (const p of approved) {
    const existing = await prisma.angelTrackEnrollment.findUnique({
      where: { profileId_track: { profileId: p.id, track: "ESCUTA" } },
      select: { id: true },
    });
    if (!existing) {
      await prisma.angelTrackEnrollment.create({
        data: {
          profileId: p.id,
          track: "ESCUTA",
          status: "APPROVED",
          approvedAt: now,
          approvedById: null,
        },
      });
      createdEnrollments += 1;
    }

    const exempt = await prisma.angelTrackTrainingExemption.findUnique({
      where: { profileId_track: { profileId: p.id, track: "ESCUTA" } },
      select: { id: true },
    });
    if (!exempt) {
      await prisma.angelTrackTrainingExemption.create({
        data: {
          profileId: p.id,
          track: "ESCUTA",
          exemptedAt: now,
          exemptedById: null,
          reason: "Backfill: legacy ESCUTA angel already active",
        },
      });
      createdExemptions += 1;
    }
  }

  console.log(`[backfill-angel-tracks] created enrollments: ${createdEnrollments}`);
  console.log(`[backfill-angel-tracks] created ESCUTA exemptions: ${createdExemptions}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

