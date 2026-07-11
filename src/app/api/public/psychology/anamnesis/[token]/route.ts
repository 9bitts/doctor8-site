import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import {
  buildAnamnesisPayload,
  PSYCHOLOGY_ANAMNESIS_FIELDS,
} from "@/lib/psychology-anamnesis";
import { isPsychologyAnamnesisEnabled } from "@/lib/psychology-feature-flags";
import { safeDecrypt } from "@/lib/psychology-api";
import {
  auditAnamnesisInviteView,
  checkAnamnesisInviteAccess,
} from "@/lib/anamnesis-invite-access";
import {
  checkRateLimit,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";

const submitSchema = z.object({
  fields: z.record(z.string(), z.string()),
});

async function recordAnamnesisView(inviteId: string, req: NextRequest): Promise<void> {
  const ip = clientIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown";
  await db.psychologyAnamnesisInvite.update({
    where: { id: inviteId },
    data: { viewCount: { increment: 1 } },
  });
  await auditAnamnesisInviteView(inviteId, ip, userAgent);
}

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  if (!isPsychologyAnamnesisEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const ip = clientIp(req);
  const rate = await checkRateLimit({
    namespace: "anamnesis-public:ip",
    key: ip,
    ...RATE_LIMITS.anamnesisPublicIp,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const invite = await db.psychologyAnamnesisInvite.findUnique({
    where: { token: params.token },
    include: {
      professional: { select: { firstName: true, lastName: true, specialty: true } },
      patientRecord: { select: { firstName: true, lastName: true } },
    },
  });

  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = checkAnamnesisInviteAccess(invite);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  await recordAnamnesisView(invite.id, req);

  const expired = invite.expiresAt < new Date();
  const completed = invite.status === "COMPLETED";

  return NextResponse.json({
    fields: PSYCHOLOGY_ANAMNESIS_FIELDS,
    psychologistName: `${invite.professional.firstName} ${invite.professional.lastName}`.trim(),
    patientName: invite.patientRecord
      ? safeDecrypt(invite.patientRecord.firstName).trim().split(/\s+/)[0] || ""
      : "",
    status: expired && !completed ? "EXPIRED" : invite.status,
    canSubmit: !completed && !expired,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } },
) {
  if (!isPsychologyAnamnesisEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const ip = clientIp(req);
  const rate = await checkRateLimit({
    namespace: "anamnesis-public:ip",
    key: ip,
    ...RATE_LIMITS.anamnesisPublicIp,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const invite = await db.psychologyAnamnesisInvite.findUnique({
    where: { token: params.token },
    include: { patientRecord: true },
  });

  if (!invite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const access = checkAnamnesisInviteAccess(invite);
  if (!access.ok) {
    if (access.status === 410 && invite.expiresAt < new Date()) {
      await db.psychologyAnamnesisInvite.update({
        where: { id: invite.id },
        data: { status: "EXPIRED" },
      });
    }
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const body = await req.json();
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  for (const field of PSYCHOLOGY_ANAMNESIS_FIELDS) {
    if (field.required && !(parsed.data.fields[field.key] || "").trim()) {
      return NextResponse.json({ error: `Missing field: ${field.key}` }, { status: 400 });
    }
  }

  const payload = buildAnamnesisPayload(parsed.data.fields);
  const patientName = invite.patientRecord
    ? `${safeDecrypt(invite.patientRecord.firstName)} ${safeDecrypt(invite.patientRecord.lastName)}`.trim()
    : "Paciente";
  const title = `Anamnese — ${patientName}`;

  await db.$transaction([
    db.medicalDocument.create({
      data: {
        patientRecordId: invite.patientRecordId,
        professionalId: invite.professionalId,
        type: "CLINICAL_NOTE",
        recordKind: "ANAMNESIS",
        title: encrypt(title),
        content: encrypt(JSON.stringify(payload)),
      },
    }),
    db.psychologyAnamnesisInvite.update({
      where: { id: invite.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        responses: encrypt(JSON.stringify(parsed.data.fields)),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
