#!/usr/bin/env npx tsx
/**
 * Audits whether every provider with volunteer hours would appear to patients.
 *
 *   npx tsx scripts/verify-volunteer-provider-visibility.ts
 *   npx tsx scripts/verify-volunteer-provider-visibility.ts --json
 */
import { PrismaClient } from "@prisma/client";
import { parseAvailabilityJson, hasConfiguredVolunteerBlocks } from "../src/lib/availability-exceptions";
import { getProviderAvailableDays } from "../src/lib/availability-slots";
import { filterDaysForScheduledVolunteerBooking } from "../src/lib/appointment-slots";
import { isVolunteerScheduledApproved, isVolunteerScheduledApprovalRequired } from "../src/lib/volunteer-scheduled-approval";
import { isAcuraVolunteerProvider } from "../src/lib/acura-volunteer";

type VisibilityIssue =
  | "not_verified"
  | "no_volunteer_config"
  | "scheduled_not_approved"
  | "no_upcoming_slots"
  | "acura_not_opted_in"
  | "not_public_profile"
  | "not_in_patient_pro_list";

type ProviderAudit = {
  id: string;
  kind: "health" | "psychoanalyst" | "integrative";
  name: string;
  verified: boolean;
  volunteerSource: ("json_blocks" | "table_volunteer_only")[];
  p8bListVisible: boolean;
  p8bIssues: VisibilityIssue[];
  acuraEligible: boolean;
  acuraPatientPanelVisible: boolean;
  acuraIssues: VisibilityIssue[];
  upcomingVolunteerSlots: number;
};

async function countUpcomingVolunteerSlots(
  id: string,
  kind: ProviderAudit["kind"],
): Promise<number> {
  const days = await getProviderAvailableDays(id, kind, "pt-BR", 14, null, {
    slotMode: "volunteer",
  });
  const filtered = filterDaysForScheduledVolunteerBooking(days);
  return filtered.flatMap((d) => d.slots).length;
}

async function auditHealth(
  prisma: PrismaClient,
  approvalRequired: boolean,
): Promise<ProviderAudit[]> {
  const rows = await prisma.professionalProfile.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      verified: true,
      acuraVolunteer: true,
      volunteerScheduledApproved: true,
      availability: true,
      virtualCard: { select: { isPublic: true } },
      availabilitySlots: {
        where: { isActive: true, volunteerOnly: true },
        select: { id: true },
      },
    },
  });

  const out: ProviderAudit[] = [];

  for (const pro of rows) {
    const jsonBlocks = parseAvailabilityJson(pro.availability).volunteerBlocks ?? [];
    const hasJson = hasConfiguredVolunteerBlocks(pro.availability);
    const hasTable = pro.availabilitySlots.length > 0;
    if (!hasJson && !hasTable) continue;

    const sources: ProviderAudit["volunteerSource"] = [];
    if (hasJson) sources.push("json_blocks");
    if (hasTable) sources.push("table_volunteer_only");

    const p8bIssues: VisibilityIssue[] = [];
    if (!pro.verified) p8bIssues.push("not_verified");
    if (!isVolunteerScheduledApproved("health", pro)) p8bIssues.push("scheduled_not_approved");

    const upcoming = pro.verified
      ? await countUpcomingVolunteerSlots(pro.id, "health")
      : 0;
    if (pro.verified && p8bIssues.length === 0 && upcoming === 0) {
      p8bIssues.push("no_upcoming_slots");
    }

    const acuraIssues: VisibilityIssue[] = [];
    const acuraEligible = isAcuraVolunteerProvider(pro.verified, pro.acuraVolunteer);
    if (!acuraEligible) {
      if (hasTable) acuraIssues.push("acura_not_opted_in");
    } else {
      if (!pro.virtualCard?.isPublic) acuraIssues.push("not_public_profile");
      if (upcoming === 0 && hasTable) acuraIssues.push("no_upcoming_slots");
    }

    out.push({
      id: pro.id,
      kind: "health",
      name: `${pro.firstName} ${pro.lastName}`.trim(),
      verified: pro.verified,
      volunteerSource: sources,
      p8bListVisible: p8bIssues.length === 0,
      p8bIssues,
      acuraEligible,
      acuraPatientPanelVisible: acuraEligible && acuraIssues.length === 0,
      acuraIssues,
      upcomingVolunteerSlots: upcoming,
    });
  }

  void approvalRequired;
  return out;
}

async function auditPsycho(prisma: PrismaClient): Promise<ProviderAudit[]> {
  const rows = await prisma.psychoanalystProfile.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      verified: true,
      acuraVolunteer: true,
      volunteerScheduledApproved: true,
      virtualCard: { select: { isPublic: true } },
      availabilitySlots: {
        where: { isActive: true, volunteerOnly: true },
        select: { id: true },
      },
    },
  });

  const out: ProviderAudit[] = [];

  for (const pro of rows) {
    if (pro.availabilitySlots.length === 0) continue;

    const p8bIssues: VisibilityIssue[] = [];
    if (!pro.verified) p8bIssues.push("not_verified");
    if (!isVolunteerScheduledApproved("psychoanalyst", pro)) p8bIssues.push("scheduled_not_approved");

    const upcoming = pro.verified
      ? await countUpcomingVolunteerSlots(pro.id, "psychoanalyst")
      : 0;
    if (pro.verified && p8bIssues.length === 0 && upcoming === 0) {
      p8bIssues.push("no_upcoming_slots");
    }

    const acuraIssues: VisibilityIssue[] = [];
    const acuraEligible = isAcuraVolunteerProvider(pro.verified, pro.acuraVolunteer);
    if (!acuraEligible) {
      acuraIssues.push("acura_not_opted_in");
    } else {
      if (!pro.virtualCard?.isPublic) acuraIssues.push("not_public_profile");
      if (upcoming === 0) acuraIssues.push("no_upcoming_slots");
    }

    out.push({
      id: pro.id,
      kind: "psychoanalyst",
      name: `${pro.firstName} ${pro.lastName}`.trim(),
      verified: pro.verified,
      volunteerSource: ["table_volunteer_only"],
      p8bListVisible: p8bIssues.length === 0,
      p8bIssues,
      acuraEligible,
      acuraPatientPanelVisible: acuraEligible && acuraIssues.length === 0,
      acuraIssues,
      upcomingVolunteerSlots: upcoming,
    });
  }

  return out;
}

async function auditIntegrative(prisma: PrismaClient): Promise<ProviderAudit[]> {
  const rows = await prisma.integrativeTherapistProfile.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      verified: true,
      acuraVolunteer: true,
      volunteerScheduledApproved: true,
      availability: true,
      virtualCard: { select: { isPublic: true } },
    },
  });

  const out: ProviderAudit[] = [];

  for (const pro of rows) {
    if (!hasConfiguredVolunteerBlocks(pro.availability)) continue;

    const p8bIssues: VisibilityIssue[] = [];
    if (!pro.verified) p8bIssues.push("not_verified");
    if (!isVolunteerScheduledApproved("integrative", pro)) p8bIssues.push("scheduled_not_approved");

    const upcoming = pro.verified
      ? await countUpcomingVolunteerSlots(pro.id, "integrative")
      : 0;
    if (pro.verified && p8bIssues.length === 0 && upcoming === 0) {
      p8bIssues.push("no_upcoming_slots");
    }

    const acuraIssues: VisibilityIssue[] = ["not_in_patient_pro_list"];
    const acuraEligible = isAcuraVolunteerProvider(pro.verified, pro.acuraVolunteer);
    if (acuraEligible && !pro.virtualCard?.isPublic) {
      acuraIssues.push("not_public_profile");
    }

    out.push({
      id: pro.id,
      kind: "integrative",
      name: `${pro.firstName} ${pro.lastName}`.trim(),
      verified: pro.verified,
      volunteerSource: ["json_blocks"],
      p8bListVisible: p8bIssues.length === 0,
      p8bIssues,
      acuraEligible,
      acuraPatientPanelVisible: false,
      acuraIssues,
      upcomingVolunteerSlots: upcoming,
    });
  }

  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const jsonOut = process.argv.includes("--json");
  const approvalRequired = isVolunteerScheduledApprovalRequired();

  try {
    const [health, psycho, integrative] = await Promise.all([
      auditHealth(prisma, approvalRequired),
      auditPsycho(prisma),
      auditIntegrative(prisma),
    ]);
    const all = [...health, ...psycho, ...integrative];

    const p8bHidden = all.filter((p) => !p.p8bListVisible);
    const acuraHidden = all.filter(
      (p) => p.volunteerSource.includes("table_volunteer_only") && !p.acuraPatientPanelVisible,
    );
    const jsonOnly = all.filter(
      (p) => p.volunteerSource.includes("json_blocks") && !p.volunteerSource.includes("table_volunteer_only"),
    );

    const summary = {
      approvalRequired,
      totalWithVolunteerHours: all.length,
      visibleInP8bList: all.filter((p) => p.p8bListVisible).length,
      hiddenFromP8bList: p8bHidden.length,
      acuraTableVolunteers: all.filter((p) => p.volunteerSource.includes("table_volunteer_only")).length,
      visibleInAcuraPatientPanel: all.filter((p) => p.acuraPatientPanelVisible).length,
      jsonBlocksOnly: jsonOnly.length,
      providers: all,
    };

    if (jsonOut) {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }

    console.log("=== Auditoria: visibilidade de horários voluntários ===\n");
    console.log(`Aprovação P8b obrigatória: ${approvalRequired ? "SIM" : "não"}`);
    console.log(`Profissionais com horário voluntário configurado: ${all.length}`);
    console.log(`Visíveis em /patient/volunteer-appointments (P8b): ${summary.visibleInP8bList}`);
    console.log(`Ocultos do fluxo P8b: ${p8bHidden.length}`);
    console.log(`Com selo Acura + slots volunteerOnly: ${summary.acuraTableVolunteers}`);
    console.log(`Visíveis no painel Acura (/patient/appointments): ${summary.visibleInAcuraPatientPanel}`);
    console.log(`Somente blocos JSON (sem grade paga Acura): ${jsonOnly.length}\n`);

    if (p8bHidden.length > 0) {
      console.log("--- Ocultos do fluxo P8b (/patient/volunteer-appointments) ---");
      for (const p of p8bHidden) {
        console.log(
          `  [${p.kind}] ${p.name} (${p.id}) — ${p.p8bIssues.join(", ")} | fontes: ${p.volunteerSource.join("+")} | slots 14d: ${p.upcomingVolunteerSlots}`,
        );
      }
      console.log();
    }

    if (acuraHidden.length > 0) {
      console.log("--- Com horário Acura mas ocultos no painel do paciente ---");
      for (const p of acuraHidden) {
        console.log(
          `  [${p.kind}] ${p.name} (${p.id}) — ${p.acuraIssues.join(", ")} | acuraEligible=${p.acuraEligible}`,
        );
      }
      console.log();
    }

    if (jsonOnly.length > 0) {
      console.log("--- Somente blocos JSON (aparecem só no P8b, não no painel Acura) ---");
      for (const p of jsonOnly) {
        console.log(
          `  [${p.kind}] ${p.name} (${p.id}) — P8b visível: ${p.p8bListVisible ? "sim" : "não"} (${p.p8bIssues.join(", ") || "ok"})`,
        );
      }
    }

    if (p8bHidden.length === 0 && acuraHidden.length === 0) {
      console.log("Nenhum profissional configurado ficou de fora dos fluxos esperados.");
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
