import { decrypt } from "@/lib/encryption";
import { buildPrescriptionPdfByFormKind } from "@/lib/prescription-pdf-router";
import type { Lang } from "@/lib/prescription-pdf";
import { enrichMedsForPrescriptionPdf, cannabisPdfComplianceLine } from "@/lib/medicina-natural-catalog/enrich-meds-for-pdf";
import type { PrescriptionItemKind } from "@/lib/prescription-item-kind";
import { formatLicense, getProfessionInfo, isDentistSpecialty } from "@/lib/profession-label";
import { isControlledFormKind } from "@/lib/controlled-prescription-pdf";
import type { PrescriptionFormKind } from "@/lib/prescription-form-kind";
import { sncrEnabled } from "@/lib/sncr/config";

type PrescriptionRow = {
  id: string;
  medications: unknown;
  instructions: string | null;
  validUntil: Date | null;
  prescriptionFormKind?: string | null;
  sncrReceiptNumber?: string | null;
  issuedViaTelemedicine?: boolean;
  professional: {
    firstName: string;
    lastName: string;
    specialty: string;
    licenseNumber: string;
    licenseState: string | null;
    clinicName?: string | null;
    clinicAddress?: string | null;
    clinicCity?: string | null;
    clinicState?: string | null;
    clinicZip?: string | null;
  } | null;
  document?: {
    patient?: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string | null;
      cpf?: string | null;
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      zipCode?: string | null;
    } | null;
    patientRecord?: {
      firstName: string;
      lastName: string;
      dateOfBirth?: string | null;
      cpf?: string | null;
      addressLine1?: string | null;
      city?: string | null;
      state?: string | null;
      country?: string | null;
      zipCode?: string | null;
    } | null;
  } | null;
};

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

function computeAge(dob: Date | null): number | null {
  if (!dob || isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  if (age < 0 || age > 130) return null;
  return age;
}

function joinAddress(parts: (string | null | undefined)[]): string {
  return parts.map((p) => (p || "").trim()).filter(Boolean).join(", ");
}

const FREQ: Record<Lang, Record<string, string>> = {
  en: {},
  pt: {
    "Once daily": "Uma vez ao dia", "Twice daily": "Duas vezes ao dia",
    "Three times daily": "Três vezes ao dia", "Every 8 hours": "A cada 8 horas",
    "Every 12 hours": "A cada 12 horas", "As needed": "Quando necessário", "Weekly": "Semanalmente",
  },
  es: {
    "Once daily": "Una vez al día", "Twice daily": "Dos veces al día",
    "Three times daily": "Tres veces al día", "Every 8 hours": "Cada 8 horas",
    "Every 12 hours": "Cada 12 horas", "As needed": "Cuando sea necesario", "Weekly": "Semanalmente",
  },
};
const CONTINUOUS_DURATION: Record<Lang, string> = {
  en: "Continuous use",
  pt: "Uso Contínuo",
  es: "Uso continuo",
};
const LOCALE: Record<Lang, string> = { en: "en-US", pt: "pt-BR", es: "es-ES" };

export async function buildPrescriptionPdfBytesForRecord(opts: {
  prescription: PrescriptionRow;
  lang: Lang;
  pharmacyQrPng?: Uint8Array;
}): Promise<Uint8Array> {
  const { prescription, lang, pharmacyQrPng } = opts;
  const locale = LOCALE[lang];
  const pro = prescription.professional;
  if (!pro) throw new Error("Professional not found");

  const rec = prescription.document?.patientRecord;
  const acc = prescription.document?.patient;
  const srcP = rec || acc;

  let patientName = "—";
  let patientDob: Date | null = null;
  let patientCpf = "";
  let addrLine = "";
  let city = "";
  let state = "";
  let country = "";
  let zip = "";
  if (srcP) {
    patientName = `${safeDecrypt(srcP.firstName)} ${safeDecrypt(srcP.lastName)}`.trim();
    patientDob = srcP.dateOfBirth ? new Date(safeDecrypt(srcP.dateOfBirth)) : null;
    patientCpf = safeDecrypt((srcP as { cpf?: string | null }).cpf ?? null);
    addrLine = safeDecrypt(srcP.addressLine1);
    city = srcP.city || "";
    state = srcP.state || "";
    country = srcP.country || "";
    zip = safeDecrypt(srcP.zipCode);
  }

  const clinicAddressFull = joinAddress([
    pro.clinicName,
    pro.clinicAddress,
    pro.clinicCity,
    pro.clinicState,
    pro.clinicZip,
  ]);

  const medsRaw = (prescription.medications as {
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
    instructions?: string;
    presentation?: string;
    pharmaceuticalForm?: string;
    mnSlug?: string;
    renisus?: boolean;
    continuousUse?: boolean;
    itemKind?: string;
  }[]).map((m) => {
    const isContinuous = m.continuousUse || m.frequency === "Continuous use";
    return {
      ...m,
      itemKind: m.itemKind as PrescriptionItemKind | undefined,
      frequency: isContinuous ? "" : (FREQ[lang][m.frequency] || m.frequency),
      duration: isContinuous ? CONTINUOUS_DURATION[lang] : m.duration,
    };
  });

  const meds = await enrichMedsForPrescriptionPdf(medsRaw, lang);
  const cannabisComplianceLine = cannabisPdfComplianceLine(meds, lang);

  const today = new Date().toLocaleDateString(locale, {
    year: "numeric", month: "long", day: "numeric",
  });
  const validUntil = prescription.validUntil
    ? new Date(prescription.validUntil).toLocaleDateString(locale, {
        year: "numeric", month: "long", day: "numeric",
      })
    : (lang === "pt" ? "Sem validade" : lang === "es" ? "Sin caducidad" : "No expiry");

  const formKind = (prescription.prescriptionFormKind || "SIMPLE") as PrescriptionFormKind;
  const sncrNumber = prescription.sncrReceiptNumber || "";
  const devMode = !sncrEnabled() || sncrNumber.startsWith("DEV-");

  return buildPrescriptionPdfByFormKind({
    formKind,
    lang,
    simple: {
      proFirstName: pro.firstName,
      proLastName: pro.lastName,
      proSpecialty: pro.specialty,
      proLicense: formatLicense(
        pro.licenseNumber,
        pro.licenseState,
        getProfessionInfo(pro.specialty).councilKey,
      ),
      clinicAddressFull,
      patientName,
      patientAge: computeAge(patientDob),
      patientCpf,
      patientAddressFull: joinAddress([addrLine, city, state, zip, country]),
      prescriptionId: prescription.id,
      todayText: today,
      validUntilText: validUntil,
      medications: meds,
      instructions: prescription.instructions ? safeDecrypt(prescription.instructions) : "",
      signed: false,
      pharmacyQrPng,
      councilComplianceLine: isDentistSpecialty(pro.specialty)
        ? (lang === "en"
          ? "Issued per CFO Resolution 278/2025 and applicable dental practice regulations."
          : lang === "es"
            ? "Documento emitido conforme Resolucion CFO 278/2025 y normativa odontologica vigente."
            : "Documento emitido conforme Resolucao CFO 278/2025 e normas vigentes do exercicio odontologico.")
        : null,
      cannabisComplianceLine,
    },
    controlled: isControlledFormKind(formKind)
      ? {
          formKind,
          sncrReceiptNumber: sncrNumber || "—",
          proFirstName: pro.firstName,
          proLastName: pro.lastName,
          proSpecialty: pro.specialty,
          proLicense: formatLicense(
            pro.licenseNumber,
            pro.licenseState,
            getProfessionInfo(pro.specialty).councilKey,
          ),
          clinicAddressFull,
          patientName,
          patientAge: computeAge(patientDob),
          patientCpf,
          patientAddressFull: joinAddress([addrLine, city, state, zip, country]),
          todayText: today,
          validUntilText: validUntil,
          medications: meds,
          instructions: prescription.instructions ? safeDecrypt(prescription.instructions) : "",
          issuedViaTelemedicine: prescription.issuedViaTelemedicine,
          devMode,
          pharmacyQrPng,
        }
      : undefined,
  });
}
