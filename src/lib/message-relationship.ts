// Verifies that two users may exchange messages (anti-spam / PHI solicitation guard).

import { db } from "@/lib/db";
import { hasAcceptedLink } from "@/lib/patient-professional-link";

async function hasExistingMessageThread(userA: string, userB: string): Promise<boolean> {
  const msg = await db.message.findFirst({
    where: {
      deletedAt: null,
      OR: [
        { senderId: userA, receiverId: userB },
        { senderId: userB, receiverId: userA },
      ],
    },
    select: { id: true },
  });
  return !!msg;
}

async function appointmentBetweenUsers(
  senderId: string,
  receiverId: string,
): Promise<boolean> {
  const [sender, receiver] = await Promise.all([
    db.user.findUnique({
      where: { id: senderId },
      select: {
        role: true,
        patientProfile: { select: { id: true } },
        professionalProfile: { select: { id: true } },
        psychoanalystProfile: { select: { id: true } },
        integrativeTherapistProfile: { select: { id: true } },
      },
    }),
    db.user.findUnique({
      where: { id: receiverId },
      select: {
        role: true,
        patientProfile: { select: { id: true } },
        professionalProfile: { select: { id: true } },
        psychoanalystProfile: { select: { id: true } },
        integrativeTherapistProfile: { select: { id: true } },
      },
    }),
  ]);
  if (!sender || !receiver) return false;

  const patientProfileId =
    sender.patientProfile?.id ?? receiver.patientProfile?.id;
  if (!patientProfileId) return false;

  const providerIds = [
    sender.professionalProfile?.id,
    sender.psychoanalystProfile?.id,
    sender.integrativeTherapistProfile?.id,
    receiver.professionalProfile?.id,
    receiver.psychoanalystProfile?.id,
    receiver.integrativeTherapistProfile?.id,
  ].filter((id): id is string => !!id);

  if (providerIds.length === 0) return false;

  const appt = await db.appointment.findFirst({
    where: {
      patientId: patientProfileId,
      OR: [
        { professionalId: { in: providerIds } },
        { psychoanalystId: { in: providerIds } },
        { integrativeTherapistId: { in: providerIds } },
      ],
    },
    select: { id: true },
  });
  return !!appt;
}

async function sharedRecordBetweenUsers(
  senderId: string,
  receiverId: string,
): Promise<boolean> {
  const share = await db.sharedRecord.findFirst({
    where: {
      OR: [
        { sharedWithUserId: receiverId, patient: { userId: senderId } },
        { sharedWithUserId: senderId, patient: { userId: receiverId } },
        { sharedByUserId: senderId, sharedWithUserId: receiverId },
        { sharedByUserId: receiverId, sharedWithUserId: senderId },
      ],
    },
    select: { id: true },
  });
  return !!share;
}

/**
 * Returns true when sender may message receiver (existing thread, clinical link, or appointment).
 */
export async function canUsersExchangeMessages(
  senderId: string,
  receiverId: string,
): Promise<boolean> {
  if (senderId === receiverId) return false;

  const [sender, receiver] = await Promise.all([
    db.user.findUnique({ where: { id: senderId }, select: { role: true } }),
    db.user.findUnique({ where: { id: receiverId }, select: { role: true } }),
  ]);
  if (!sender || !receiver) return false;

  if (sender.role === "ADMIN" || receiver.role === "ADMIN") return true;

  if (sender.role === "PATIENT" && receiver.role === "PATIENT") return false;

  if (await hasExistingMessageThread(senderId, receiverId)) return true;

  const patientUserId =
    sender.role === "PATIENT" ? senderId : receiver.role === "PATIENT" ? receiverId : null;
  const careUserId =
    patientUserId === senderId ? receiverId : patientUserId === receiverId ? senderId : null;

  if (patientUserId && careUserId) {
    if (await hasAcceptedLink(patientUserId, careUserId)) return true;
    if (await appointmentBetweenUsers(senderId, receiverId)) return true;
    if (await sharedRecordBetweenUsers(senderId, receiverId)) return true;
  }

  if (await appointmentBetweenUsers(senderId, receiverId)) return true;
  if (await sharedRecordBetweenUsers(senderId, receiverId)) return true;

  return false;
}
