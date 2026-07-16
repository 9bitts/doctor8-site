import { PatientAcquisitionChannel } from "@prisma/client";
import { db } from "@/lib/db";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export const HUMANITARIAN_PATIENT_HOME = "/humanitarian/painel";

/** ACURA SOS form — always belongs in the humanitarian patient portal. */
export const ACURA_HUMANITARIAN_ACQUISITION_CHANNEL =
  PatientAcquisitionChannel.ACURA_SOS_FORM;

/**
 * Channels that permanently route the patient to the humanitarian portal
 * (`/humanitarian/painel`) on every login.
 */
export const HUMANITARIAN_PORTAL_ACQUISITION_CHANNELS: readonly PatientAcquisitionChannel[] = [
  PatientAcquisitionChannel.ACURA_SOS_FORM,
  PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN,
];

export function isHumanitarianAcquisitionChannel(
  channel: PatientAcquisitionChannel | null | undefined,
): boolean {
  return (
    channel === PatientAcquisitionChannel.ACURA_SOS_FORM ||
    channel === PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN
  );
}

export async function patientHasHumanitarianActivity(userId: string): Promise<boolean> {
  const [intake, entry] = await Promise.all([
    db.humanitarianIntake.findFirst({
      where: {
        patientUserId: userId,
        campaign: { slug: VENEZUELA_CAMPAIGN_SLUG },
      },
      select: { id: true },
    }),
    db.humanitarianQueueEntry.findFirst({
      where: { patientUserId: userId },
      select: { id: true },
    }),
  ]);
  return Boolean(intake || entry);
}

export async function resolveHumanitarianPatientFlag(userId: string): Promise<boolean> {
  const [profile, partnerIntake] = await Promise.all([
    db.patientProfile.findUnique({
      where: { userId },
      select: { acquisitionChannel: true },
    }),
    db.partnerIntake.findFirst({
      where: { patientUserId: userId },
      select: { id: true },
    }),
  ]);

  if (isHumanitarianAcquisitionChannel(profile?.acquisitionChannel)) return true;
  return Boolean(partnerIntake);
}

export const HUMANITARIAN_PATIENT_ALLOWED_PATIENT_PATHS = [
  "/patient/volunteer-appointments",
  "/patient/prescriptions",
  "/patient/exam-requests",
  "/patient/documents",
  "/patient/messages",
  "/patient/account",
];

export function isHumanitarianPatientAllowedPatientPath(pathname: string): boolean {
  return HUMANITARIAN_PATIENT_ALLOWED_PATIENT_PATHS.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function resolvePatientRoleHome(opts?: { humanitarianPatient?: boolean }): string {
  return opts?.humanitarianPatient ? HUMANITARIAN_PATIENT_HOME : "/patient";
}

export function shouldRedirectHumanitarianPatientFromPatientRoute(
  pathname: string,
  humanitarianPatient: boolean,
): boolean {
  if (!humanitarianPatient) return false;
  if (!pathname.startsWith("/patient")) return false;
  return !isHumanitarianPatientAllowedPatientPath(pathname);
}
