// src/app/api/patient/resources/route.ts
// Materials shared by doctors via ResourceShare on the patient's linked chart.

import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId } = ctx;

  const shares = await db.resourceShare.findMany({
    where: { patientRecord: { linkedUserId: userId } },
    include: {
      resource: {
        include: {
          professional: { select: { firstName: true, lastName: true, specialty: true } },
        },
      },
    },
    orderBy: { sharedAt: "desc" },
    take: 100,
  });

  const resources = shares
    .filter((s) => s.resource.professional)
    .map((s) => {
      const pro = s.resource.professional!;
      return {
        id: s.id,
        resourceId: s.resourceId,
        title: safeDecrypt(s.resource.title),
        contentPreview: safeDecrypt(s.resource.content).slice(0, 300) || null,
        url: s.resource.url || null,
        hasFile: !!s.resource.fileUrl,
        sharedAt: s.sharedAt,
        doctor: {
          name: `${pro.firstName} ${pro.lastName}`.trim(),
          specialty: pro.specialty || "",
        },
      };
    });

  return NextResponse.json({ resources });
}
