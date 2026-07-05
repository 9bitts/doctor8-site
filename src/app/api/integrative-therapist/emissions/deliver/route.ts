import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import {
  deliverIntegrativeTherapistEmissionToPatient,
  type EmissionDeliverKind,
} from "@/lib/emission-deliver";

const schema = z.object({
  kind: z.enum(["prescription", "exam", "document"]),
  id: z.string().min(1),
  sendWhatsApp: z.boolean().optional(),
  whatsappMessage: z.string().max(1000).optional(),
  forceWhatsapp: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { session } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { kind, id, sendWhatsApp, whatsappMessage, forceWhatsapp } = parsed.data;
  const deliverKind: EmissionDeliverKind =
    kind === "exam" ? "exam" : kind === "document" ? "document" : "prescription";

  const result = await deliverIntegrativeTherapistEmissionToPatient(
    session.user.id,
    deliverKind,
    id,
    { sendWhatsApp, whatsappMessage, forceWhatsapp },
  );

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
