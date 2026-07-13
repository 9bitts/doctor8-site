import { PatientAcquisitionChannel } from "@prisma/client";
import { db } from "@/lib/db";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export const HUMANITARIAN_PATIENT_HOME = "/humanitarian/painel";

const HUMANITARIAN_ACQUISITION_CHANNELS: PatientAcquisitionChannel[] = [
  PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN,
  PatientAcquisitionChannel.DOCTOR8_SOS_LANDING,
  PatientAcquisitionChannel.ACURA_SOS_FORM,
];

export function isHumanitarianAcquisitionChannel(
  channel: PatientAcquisitionChannel | null | undefined,
): boolean {
  if (!channel) return false;
  return HUMANITARIAN_ACQUISITION_CHANNELS.includes(channel);
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
  const profile = await db.patientProfile.findUnique({
    where: { userId },
    select: { acquisitionChannel: true },
  });
  if (isHumanitarianAcquisitionChannel(profile?.acquisitionChannel)) return true;
  return patientHasHumanitarianActivity(userId);
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
