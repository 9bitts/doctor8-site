#!/usr/bin/env npx tsx
/**
 * Count document + prescription templates for a professional (by email or name).
 *
 *   npx tsx scripts/diagnose-professional-templates.ts --email=dr@example.com
 *   npx tsx scripts/diagnose-professional-templates.ts --q=jordao
 */
import { db } from "../src/lib/db";
import {
  resolveDocumentTemplateCategory,
  resolvePrescriptionTemplateCategory,
} from "../src/lib/clinical-template-utils";

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

async function main() {
  const email = arg("email")?.toLowerCase();
  const q = arg("q")?.toLowerCase();

  if (!email && !q) {
    console.error("Usage: --email=... or --q=name");
    process.exit(1);
  }

  const professionals = await db.professionalProfile.findMany({
    where: email
      ? { user: { email } }
      : {
          OR: [
            { firstName: { contains: q!, mode: "insensitive" } },
            { lastName: { contains: q!, mode: "insensitive" } },
            { user: { email: { contains: q!, mode: "insensitive" } } },
          ],
        },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      user: { select: { email: true } },
    },
    take: 10,
  });

  if (professionals.length === 0) {
    console.log("No professional found.");
    return;
  }

  for (const pro of professionals) {
    const [docs, rxs] = await Promise.all([
      db.documentTemplate.findMany({
        where: { professionalId: pro.id },
        select: {
          id: true,
          name: true,
          documentType: true,
          templateCategory: true,
          body: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      db.prescriptionTemplate.findMany({
        where: { professionalId: pro.id },
        select: {
          id: true,
          name: true,
          templateCategory: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const visibleDocs = docs.filter((d) => resolveDocumentTemplateCategory(d) != null);
    const hiddenDocs = docs.filter((d) => resolveDocumentTemplateCategory(d) == null);
    const visibleRx = rxs.filter((r) => resolvePrescriptionTemplateCategory(r) != null);
    const hiddenRx = rxs.filter((r) => resolvePrescriptionTemplateCategory(r) == null);

    console.log("\n===", `${pro.firstName} ${pro.lastName}`, pro.user.email, pro.id, "===");
    console.log(`DocumentTemplate total=${docs.length} visibleInUI=${visibleDocs.length} hidden=${hiddenDocs.length}`);
    console.log(`PrescriptionTemplate total=${rxs.length} visibleInUI=${visibleRx.length} hidden=${hiddenRx.length}`);
    console.log(`TOTAL in DB=${docs.length + rxs.length} TOTAL shown in sections=${visibleDocs.length + visibleRx.length}`);

    if (hiddenDocs.length) {
      console.log("\nHidden document templates (not mapped to exam/certificate sections):");
      for (const d of hiddenDocs) {
        console.log(
          `  - ${d.id} | type=${d.documentType} | cat=${d.templateCategory ?? "null"} | ${d.name}`,
        );
      }
    }
    if (hiddenRx.length) {
      console.log("\nHidden prescription templates:");
      for (const r of hiddenRx) {
        console.log(`  - ${r.id} | cat=${r.templateCategory ?? "null"} | ${r.name}`);
      }
    }

    const byType = new Map<string, number>();
    for (const d of docs) {
      const key = `${d.documentType}/${d.templateCategory ?? "null"}`;
      byType.set(key, (byType.get(key) || 0) + 1);
    }
    console.log("\nDocument breakdown:");
    for (const [k, n] of [...byType.entries()].sort()) console.log(`  ${k}: ${n}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
