import { db } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/encryption";
import { decryptIdentificationData, encryptIdentificationData } from "@/lib/humanitarian/intake-encryption";
import { encryptUserPhone, userPhoneDigits } from "@/lib/user-phone";
import type { IdentificationData } from "@/lib/humanitarian/anamnese";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

export type HumanitarianPhoneParts = {
  ddi: string;
  ddd: string;
  number: string;
};

/** Builds E.164 digits (no +) from DDI + DDD + local number. */
export function formatHumanitarianPhoneParts(
  ddi: string,
  ddd: string,
  number: string,
): string | null {
  const ddiDigits = ddi.replace(/\D/g, "");
  const dddDigits = ddd.replace(/\D/g, "");
  const numDigits = number.replace(/\D/g, "");
  if (!ddiDigits || dddDigits.length < 2 || numDigits.length < 8) return null;
  const full = `${ddiDigits}${dddDigits}${numDigits}`;
  return full.length >= 12 && full.length <= 15 ? full : null;
}

export function phoneFromIdentification(data: IdentificationData | null | undefined): string | null {
  if (!data) return null;
  if (data.phoneDdi && data.phoneDdd && data.phoneNumber) {
    return formatHumanitarianPhoneParts(data.phoneDdi, data.phoneDdd, data.phoneNumber);
  }
  const raw = data.phone?.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 12 ? digits : null;
}

export function parsePhoneToParts(raw: string): HumanitarianPhoneParts {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("58") && digits.length >= 12) {
    return { ddi: "58", ddd: digits.slice(2, 5), number: digits.slice(5) };
  }
  if (digits.startsWith("55") && digits.length >= 12) {
    return { ddi: "55", ddd: digits.slice(2, 4), number: digits.slice(4) };
  }
  if (digits.startsWith("1") && digits.length >= 11) {
    return { ddi: "1", ddd: digits.slice(1, 4), number: digits.slice(4) };
  }
  if (digits.length >= 10) {
    return { ddi: "58", ddd: digits.slice(0, 3), number: digits.slice(3) };
  }
  return { ddi: "58", ddd: "", number: digits };
}

export async function resolvePatientHumanitarianPhone(patientUserId: string): Promise<string | null> {
  const [profile, user, intake] = await Promise.all([
    db.patientProfile.findUnique({
      where: { userId: patientUserId },
      select: { phone: true },
    }),
    db.user.findUnique({
      where: { id: patientUserId },
      select: { phone: true },
    }),
    db.humanitarianIntake.findFirst({
      where: { patientUserId },
      orderBy: { updatedAt: "desc" },
      select: { identificationData: true },
    }),
  ]);

  const fromIntake = phoneFromIdentification(
    decryptIdentificationData(intake?.identificationData as IdentificationData | null),
  );
  if (fromIntake) return fromIntake;

  if (profile?.phone) {
    const digits = safeDecrypt(profile.phone).replace(/\D/g, "");
    if (digits.length >= 12) return digits;
  }

  if (user?.phone) {
    const digits = userPhoneDigits(user.phone);
    if (digits.length >= 12) return digits;
  }

  return null;
}

export async function savePatientHumanitarianPhone(
  patientUserId: string,
  parts: HumanitarianPhoneParts,
  campaignId?: string,
): Promise<string> {
  const e164 = formatHumanitarianPhoneParts(parts.ddi, parts.ddd, parts.number);
  if (!e164) throw new Error("INVALID_PHONE");

  const profile = await db.patientProfile.findUnique({
    where: { userId: patientUserId },
    select: { id: true },
  });
  if (!profile) throw new Error("NO_PROFILE");

  const phonePatch: IdentificationData = {
    phoneDdi: parts.ddi.replace(/\D/g, ""),
    phoneDdd: parts.ddd.replace(/\D/g, ""),
    phoneNumber: parts.number.replace(/\D/g, ""),
    phone: `+${e164}`,
  };

  await db.$transaction(async (tx) => {
    await tx.patientProfile.update({
      where: { id: profile.id },
      data: { phone: encrypt(`+${e164}`) },
    });
    await tx.user.update({
      where: { id: patientUserId },
      data: { phone: encryptUserPhone(e164) },
    });

    if (campaignId) {
      const intake = await tx.humanitarianIntake.findUnique({
        where: {
          campaignId_patientUserId: { campaignId, patientUserId },
        },
      });
      if (intake) {
        const prev = decryptIdentificationData(
          intake.identificationData as IdentificationData | null,
        ) ?? {};
        await tx.humanitarianIntake.update({
          where: { id: intake.id },
          data: {
            identificationData: encryptIdentificationData({ ...prev, ...phonePatch }),
          },
        });
      }
    }
  });

  return e164;
}

export function buildVolunteerWhatsAppMessage(
  volunteerName: string,
  lang: "pt" | "en" | "es",
): string {
  const templates = {
    pt: `Ol?! Sou ${volunteerName}, volunt?rio(a) do atendimento humanit?rio Doctor8 (SOS Venezuela). Entro em contato para iniciar seu atendimento gratuito. Por favor, responda quando puder.`,
    en: `Hello! I am ${volunteerName}, a Doctor8 humanitarian volunteer (SOS Venezuela). I am reaching out to start your free consultation. Please reply when you can.`,
    es: `?Hola! Soy ${volunteerName}, voluntario/a del programa humanitario Doctor8 (SOS Venezuela). Me comunico para iniciar su atenci?n gratuita. Por favor responda cuando pueda.`,
  };
  return templates[lang] ?? templates.es;
}
