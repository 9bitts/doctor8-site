import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import {
  anamnesisPublicUrl,
  PSYCHOLOGY_ANAMNESIS_FIELDS,
} from "@/lib/psychology-anamnesis";
import { isPsychologyAnamnesisEnabled } from "@/lib/psychology-feature-flags";
import { parsePsychologyContent, requirePsychologist, safeDecrypt } from "@/lib/psychology-api";

const createSchema = z.object({
  patientRecordId: z.string(),
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

export async function GET() {
  if (!isPsychologyAnamnesisEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const now = new Date();
  const invites = await db.psychologyAnamnesisInvite.findMany({
    where: { professionalId: professional.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      patientRecord: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return NextResponse.json({
    fields: PSYCHOLOGY_ANAMNESIS_FIELDS,
    invites: invites.map((inv) => {
      const expired = inv.status === "PENDING" && inv.expiresAt < now;
      return {
        id: inv.id,
        token: inv.token,
        url: anamnesisPublicUrl(inv.token),
        status: expired ? "EXPIRED" : inv.status,
        patientRecordId: inv.patientRecordId,
        patientName: inv.patientRecord
          ? `${safeDecrypt(inv.patientRecord.firstName)} ${safeDecrypt(inv.patientRecord.lastName)}`.trim()
          : "—",
        expiresAt: inv.expiresAt.toISOString(),
        completedAt: inv.completedAt?.toISOString() ?? null,
        createdAt: inv.createdAt.toISOString(),
      };
    }),
  });
}

export async function POST(req: NextRequest) {
  if (!isPsychologyAnamnesisEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const record = await db.patientRecord.findUnique({ where: { id: parsed.data.patientRecordId } });
  if (!record || record.professionalId !== professional.id)
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const days = parsed.data.expiresInDays ?? 14;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const invite = await db.psychologyAnamnesisInvite.create({
    data: {
      token: randomBytes(32).toString("base64url"),
      patientRecordId: record.id,
      professionalId: professional.id,
      expiresAt,
    },
  });

  return NextResponse.json({
    id: invite.id,
    token: invite.token,
    url: anamnesisPublicUrl(invite.token),
    expiresAt: invite.expiresAt.toISOString(),
  }, { status: 201 });
}

/** List completed anamnesis documents for a chart (from invites + medical docs). */
export async function PUT(req: NextRequest) {
  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { professional } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const { patientRecordId } = await req.json() as { patientRecordId?: string };
  if (!patientRecordId) return NextResponse.json({ error: "patientRecordId required" }, { status: 400 });

  const record = await db.patientRecord.findUnique({ where: { id: patientRecordId } });
  if (!record || record.professionalId !== professional.id)
    return NextResponse.json({ error: "Chart not found" }, { status: 404 });

  const docs = await db.medicalDocument.findMany({
    where: { patientRecordId, type: "CLINICAL_NOTE" },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const anamneses = docs
    .map((d) => {
      const content = parsePsychologyContent(safeDecrypt(d.content));
      if (!content?.psychologyAnamnesis) return null;
      return {
        id: d.id,
        title: safeDecrypt(d.title),
        fields: content.fields as Record<string, string>,
        renderedBody: content.renderedBody as string,
        createdAt: d.createdAt.toISOString(),
      };
    })
    .filter(Boolean);

  return NextResponse.json({ anamneses });
}
