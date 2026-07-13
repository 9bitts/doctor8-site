import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { encrypt } from "@/lib/encryption";
import { parseRegistrationPhone, registrationPhoneErrorMessage } from "@/lib/international-phone";
import { saveRegistrationPhone } from "@/lib/save-registration-phone";
import { createRegisterConsents } from "@/lib/consent/register-consents";
import { recordTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  checkRateLimits,
  clientIp,
  RATE_LIMITS,
  rateLimitResponse,
} from "@/lib/rate-limit";
import { normalizeLang } from "@/lib/i18n/translations";
import { resolveRegistrationRegionForSignup } from "@/lib/detect-registration-region";

export const runtime = "nodejs";

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[0-9]/, "At least one number")
  .regex(/[^A-Za-z0-9]/, "At least one special character");

const schema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  fullName: z.string().min(2).max(200),
  phoneDdi: z.string().min(1).max(4),
  phoneDdd: z.string().min(1).max(3),
  phoneNumber: z.string().min(6).max(15),
  relationship: z.enum(["Sou o paciente", "Sou familiar ou responsável", "Outra pessoa solicita ajuda"]),
  patientAgeOrDob: z.string().max(50).optional(),
  state: z.string().min(1).max(100),
  city: z.string().min(1).max(100),
  serviceRequested: z.enum([
    "Atendimento médico",
    "Atendimento psicológico",
    "Médico e psicológico",
    "Psicanálise",
    "Terapias integrativas",
    "Não tenho certeza — preciso de orientação",
  ]),
  urgency: z.enum([
    "Emergência — risco de vida ou trauma grave",
    "Alta prioridade — dor intensa, crise emocional aguda",
    "Atendimento regular",
  ]),
  description: z.string().min(10).max(2000),
  additionalInfo: z.string().max(2000).optional(),
  acceptedTelemedicineTcle: z.literal(true),
  acceptedTerms: z.literal(true),
  acceptedPrivacy: z.literal(true),
  lang: z.enum(["pt", "es", "en"]).optional(),
  campaignSlug: z.string().optional(),
});

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "";
  const lastName = parts.slice(1).join(" ") || ".";
  return { firstName, lastName };
}

function mapServiceTypes(serviceRequested: z.infer<typeof schema>["serviceRequested"]): string[] {
  switch (serviceRequested) {
    case "Atendimento médico":
      return ["medico"];
    case "Atendimento psicológico":
      return ["psicologo"];
    case "Médico e psicológico":
      return ["medico", "psicologo"];
    case "Psicanálise":
      return ["psicanalista"];
    case "Terapias integrativas":
      return ["terapeuta_integrativo"];
    case "Não tenho certeza — preciso de orientação":
      return ["nao_sei"];
  }
}

function mapPriority(urgency: z.infer<typeof schema>["urgency"]) {
  if (urgency.startsWith("Emergência")) return "CRISIS" as const;
  if (urgency.startsWith("Alta prioridade")) return "URGENT" as const;
  return "ROUTINE" as const;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { errorCode: "VALIDATION_ERROR", error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const ip = clientIp(req);
    const rate = await checkRateLimits([
      { namespace: "register:email", key: parsed.data.email.toLowerCase(), ...RATE_LIMITS.authEmail },
      { namespace: "register:ip", key: ip, ...RATE_LIMITS.authIp },
    ]);
    if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

    const normalizedLang = parsed.data.lang ? normalizeLang(parsed.data.lang) : "pt";

    const phoneParsed = parseRegistrationPhone({
      phoneDdi: parsed.data.phoneDdi,
      phoneNational: `${parsed.data.phoneDdd}${parsed.data.phoneNumber}`,
    });
    if ("error" in phoneParsed) {
      return NextResponse.json(
        {
          errorCode: "VALIDATION_ERROR",
          error: {
            phoneNumber: [registrationPhoneErrorMessage(normalizedLang, phoneParsed.error)],
          },
        },
        { status: 400 },
      );
    }

    const region = resolveRegistrationRegionForSignup({
      explicit: "US",
      phoneDdi: parsed.data.phoneDdi,
      language: normalizedLang,
      headers: req.headers,
    });

    const email = parsed.data.email.toLowerCase();
    const { firstName, lastName } = splitName(parsed.data.fullName);
    const now = new Date();
    const userAgent = req.headers.get("user-agent") || "unknown";
    const campaignSlug = parsed.data.campaignSlug || VENEZUELA_CAMPAIGN_SLUG;

    const campaign = await db.humanitarianCampaign.findUnique({
      where: { slug: campaignSlug },
      select: { id: true, active: true },
    });
    if (!campaign?.active) {
      return NextResponse.json(
        { errorCode: "CAMPAIGN_UNAVAILABLE", error: "Campaign not available" },
        { status: 404 },
      );
    }

    const existing = await db.user.findUnique({
      where: { email },
      select: { id: true, role: true, passwordHash: true },
    });

    if (existing?.passwordHash) {
      // Avoid enumerating accounts: return generic ack.
      return NextResponse.json({ success: true, userId: existing.id, existing: true });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);

    const created = await db.$transaction(async (tx) => {
      const user = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: {
              passwordHash,
              role: "PATIENT",
              region,
              language: normalizedLang,
              emailVerified: now, // humanitarian portal: no email verification
            },
          })
        : await tx.user.create({
            data: {
              email,
              passwordHash,
              role: "PATIENT",
              region,
              language: normalizedLang,
              emailVerified: now, // humanitarian portal: no email verification
            },
          });

      // Ensure patient profile exists
      const profile = await tx.patientProfile.findUnique({
        where: { userId: user.id },
        select: { userId: true, acquisitionChannel: true },
      });
      if (!profile) {
        await tx.patientProfile.create({
          data: {
            userId: user.id,
            firstName: encrypt(firstName),
            lastName: encrypt(lastName),
            acquisitionChannel: "DOCTOR8_HUMANITARIAN",
            acquisitionCampaign: campaignSlug,
            acquisitionRecordedAt: now,
            acquisitionReferrer: "/atendimentohumanitario",
          },
        });
      } else if (!profile.acquisitionChannel) {
        await tx.patientProfile.update({
          where: { userId: user.id },
          data: {
            acquisitionChannel: "DOCTOR8_HUMANITARIAN",
            acquisitionCampaign: campaignSlug,
            acquisitionRecordedAt: now,
            acquisitionReferrer: "/atendimentohumanitario",
          },
        });
      }

      await createRegisterConsents(tx, user.id, ip, userAgent, {
        acceptedTerms: parsed.data.acceptedTerms,
        acceptedPrivacy: parsed.data.acceptedPrivacy,
        acceptedProfessionalTerms: false,
      });

      await saveRegistrationPhone(tx, user.id, "PATIENT", phoneParsed.e164);

      const serviceTypes = mapServiceTypes(parsed.data.serviceRequested);
      const computedPriority = mapPriority(parsed.data.urgency);

      await tx.humanitarianIntake.upsert({
        where: {
          campaignId_patientUserId: {
            campaignId: campaign.id,
            patientUserId: user.id,
          },
        },
        create: {
          campaignId: campaign.id,
          patientUserId: user.id,
          triageCompletedAt: now,
          computedPriority,
          triageFlags: ["portal:atendimentohumanitario"],
          status: "TRIAGE_ONLY",
          identificationData: {
            fullName: parsed.data.fullName,
            ageOrDob: parsed.data.patientAgeOrDob || "",
            phoneDdi: parsed.data.phoneDdi,
            phoneDdd: parsed.data.phoneDdd,
            phoneNumber: parsed.data.phoneNumber,
            email,
            state: parsed.data.state,
            municipality: parsed.data.city,
          },
          serviceTypes,
          additionalNotes: [
            `Relação com o paciente: ${parsed.data.relationship}`,
            `Urgência percebida: ${parsed.data.urgency}`,
            `Descrição: ${parsed.data.description}`,
            parsed.data.additionalInfo ? `Info adicional: ${parsed.data.additionalInfo}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
        update: {
          triageCompletedAt: now,
          computedPriority,
          triageFlags: { set: ["portal:atendimentohumanitario"] },
          serviceTypes: { set: serviceTypes },
          identificationData: {
            fullName: parsed.data.fullName,
            ageOrDob: parsed.data.patientAgeOrDob || "",
            phoneDdi: parsed.data.phoneDdi,
            phoneDdd: parsed.data.phoneDdd,
            phoneNumber: parsed.data.phoneNumber,
            email,
            state: parsed.data.state,
            municipality: parsed.data.city,
          },
          additionalNotes: [
            `Relação com o paciente: ${parsed.data.relationship}`,
            `Urgência percebida: ${parsed.data.urgency}`,
            `Descrição: ${parsed.data.description}`,
            parsed.data.additionalInfo ? `Info adicional: ${parsed.data.additionalInfo}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
        },
      });

      return user;
    });

    await recordTelemedicineTcle({
      userId: created.id,
      ipAddress: ip,
      userAgent,
      campaignId: campaign.id,
    });

    return NextResponse.json({ success: true, userId: created.id }, { status: 201 });
  } catch (error) {
    console.error("[REGISTER HUMANITARIAN ERROR]", error);
    return NextResponse.json(
      { errorCode: "INTERNAL_ERROR", error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

