import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import {
  listTransmissions,
  transmitToPartner,
  buildAndQueueS2220FromExam,
  buildAndQueueS2240ForMember,
} from "@/lib/employer-esocial-partner";
import { isEsocialPartnerConfigured } from "@/lib/employer-integrations";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const transmissions = await listTransmissions(ctx.employerCompanyId);
  return NextResponse.json({
    transmissions: transmissions.map((t) => ({
      id: t.id,
      eventType: t.eventType,
      eventRefId: t.eventRefId,
      status: t.status,
      partnerName: t.partnerName,
      partnerRef: t.partnerRef,
      sentAt: t.sentAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
    partnerConfigured: isEsocialPartnerConfigured(),
    demoMode: !isEsocialPartnerConfigured(),
  });
}

const queueSchema = z.object({
  action: z.enum(["queue_s2220", "queue_s2240", "transmit"]),
  examId: z.string().optional(),
  workforceMemberId: z.string().optional(),
  transmissionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = queueSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "queue_s2220") {
    if (!parsed.data.examId) {
      return NextResponse.json({ error: "examId required" }, { status: 400 });
    }
    const tx = await buildAndQueueS2220FromExam(parsed.data.examId, ctx.employerCompanyId);
    if (!tx) return NextResponse.json({ error: "Exam not ready for S-2220" }, { status: 400 });
    return NextResponse.json({ transmission: tx }, { status: 201 });
  }

  if (parsed.data.action === "queue_s2240") {
    if (!parsed.data.workforceMemberId) {
      return NextResponse.json({ error: "workforceMemberId required" }, { status: 400 });
    }
    const tx = await buildAndQueueS2240ForMember(
      parsed.data.workforceMemberId,
      ctx.employerCompanyId,
    );
    if (!tx) return NextResponse.json({ error: "Could not build S-2240" }, { status: 400 });
    return NextResponse.json({ transmission: tx }, { status: 201 });
  }

  if (parsed.data.action === "transmit") {
    if (!parsed.data.transmissionId) {
      return NextResponse.json({ error: "transmissionId required" }, { status: 400 });
    }
    const result = await transmitToPartner(parsed.data.transmissionId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
