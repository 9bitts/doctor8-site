// src/app/api/patient/resources/route.ts
// Materials shared by doctors via ResourceShare on the patient's linked chart.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shares = await db.resourceShare.findMany({
    where: { patientRecord: { linkedUserId: session.user.id } },
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
