import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { z } from "zod";
import {
  AppointmentSlotTakenError,
  fulfillEapConsultation,
} from "@/lib/fulfill-consultation";
import {
  assertEapPsychologistBooking,
  resolveEapBookingContext,
} from "@/lib/employer-eap-booking";

const EAP_ERROR_MESSAGES: Record<string, string> = {
  provider_not_found: "Psicólogo não encontrado.",
  not_psychologist: "O benefício EAP é válido apenas para psicólogos.",
  not_in_eap_network: "Este profissional não faz parte da rede EAP da sua empresa.",
  no_benefit: "Benefício EAP indisponível ou cota esgotada.",
};

const schema = z.object({
  professionalId: z.string(),
  scheduledAt: z.string().datetime(),
  type: z.enum(["TELECONSULT", "IN_PERSON"]),
  acceptedCancellationPolicy: z.boolean(),
  visitReason: z.string().max(2000).optional(),
  healthPlanSlug: z.string().max(80).optional(),
  healthPlanLabel: z.string().max(120).optional(),
  serviceId: z.string().optional(),
  serviceName: z.string().max(120).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ctx = await resolveEapBookingContext(session.user.id, session.user.email);
  if (!ctx) {
    return NextResponse.json({ error: "no_benefit", active: false }, { status: 404 });
  }

  return NextResponse.json({
    active: true,
    companyName: ctx.companyName,
    sessionsRemaining: ctx.sessionsRemaining,
    linkedPsychologistIds: ctx.linkedPsychologistIds,
    jitEnabled: ctx.jitEnabled,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (!parsed.data.acceptedCancellationPolicy) {
    return NextResponse.json(
      { error: { general: ["Aceite a política de cancelamento."] } },
      { status: 400 },
    );
  }

  const ctx = await resolveEapBookingContext(session.user.id, session.user.email);
  if (!ctx) {
    return NextResponse.json(
      { error: { general: [EAP_ERROR_MESSAGES.no_benefit] } },
      { status: 400 },
    );
  }

  const proCheck = await assertEapPsychologistBooking(
    parsed.data.professionalId,
    ctx.employerCompanyId,
    ctx.linkedPsychologistIds,
  );
  if (!proCheck.ok) {
    return NextResponse.json(
      { error: { general: [EAP_ERROR_MESSAGES[proCheck.code] || "Reserva EAP inválida."] } },
      { status: 400 },
    );
  }

  try {
    const result = await fulfillEapConsultation({
      userId: session.user.id,
      professionalId: parsed.data.professionalId,
      scheduledAt: parsed.data.scheduledAt,
      type: parsed.data.type,
      acceptedCancellationPolicy: parsed.data.acceptedCancellationPolicy,
      workforceMemberId: ctx.workforceMemberId,
      visitReason: parsed.data.visitReason,
      healthPlanSlug: parsed.data.healthPlanSlug,
      healthPlanLabel: parsed.data.healthPlanLabel,
      serviceId: parsed.data.serviceId,
      serviceName: parsed.data.serviceName,
    });

    await audit.createRecord(session.user.id, "Appointment", result.appointmentId);

    return NextResponse.json({ success: true, appointmentId: result.appointmentId });
  } catch (e) {
    if (e instanceof AppointmentSlotTakenError) {
      return NextResponse.json(
        { error: { general: ["Este horário não está mais disponível."] } },
        { status: 409 },
      );
    }
    const msg = e instanceof Error ? e.message : "Booking failed";
    if (msg.includes("quota")) {
      return NextResponse.json(
        { error: { general: [EAP_ERROR_MESSAGES.no_benefit] } },
        { status: 400 },
      );
    }
    console.error("[EAP BOOKING]", e);
    return NextResponse.json({ error: { general: ["Erro ao agendar sessão EAP."] } }, { status: 500 });
  }
}
