import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deliverEmissionToPatient, type EmissionDeliverKind } from "@/lib/emission-deliver";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["prescription", "exam", "document"]),
  id: z.string().min(1),
  sendWhatsApp: z.boolean().optional(),
  whatsappMessage: z.string().max(1000).optional(),
  forceWhatsapp: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PROFESSIONAL") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { kind, id, sendWhatsApp, whatsappMessage, forceWhatsapp } = parsed.data;
  const deliverKind: EmissionDeliverKind =
    kind === "exam" ? "exam" : kind === "document" ? "document" : "prescription";

  const result = await deliverEmissionToPatient(session.user.id, deliverKind, id, {
    sendWhatsApp,
    whatsappMessage,
    forceWhatsapp,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result);
}
