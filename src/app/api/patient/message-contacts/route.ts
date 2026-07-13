// GET — professionals a patient can start a conversation with.

import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";

type Contact = {
  professionalId: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
};

function addContact(map: Map<string, Contact>, pro: {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  specialty: string;
} | null | undefined) {
  if (!pro?.userId) return;
  if (!map.has(pro.id)) {
    map.set(pro.id, {
      professionalId: pro.id,
      userId: pro.userId,
      firstName: pro.firstName,
      lastName: pro.lastName,
      specialty: pro.specialty,
    });
  }
}

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId } = ctx;

  const contacts = new Map<string, Contact>();

  const [appts, jitEntries, favorites, sent, received, humanitarianEntries] = await Promise.all([
    db.appointment.findMany({
      where: {
        patientId: patientProfileId,
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      select: {
        professional: {
          select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
        },
      },
    }),
    db.jitQueue.findMany({
      where: {
        patientUserId: userId,
        status: { in: ["WAITING", "CALLED", "IN_PROGRESS", "DONE"] },
      },
      select: {
        session: {
          select: {
            professional: {
              select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
            },
          },
        },
      },
    }),
    db.patientFavorite.findMany({
      where: { patientUserId: userId },
      select: {
        professional: {
          select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
        },
      },
    }),
    db.message.findMany({
      where: { senderId: userId, deletedAt: null },
      select: {
        receiver: {
          select: {
            role: true,
            professionalProfile: {
              select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
            },
          },
        },
      },
    }),
    db.message.findMany({
      where: { receiverId: userId, deletedAt: null },
      select: {
        sender: {
          select: {
            role: true,
            professionalProfile: {
              select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
            },
          },
        },
      },
    }),
    db.humanitarianQueueEntry.findMany({
      where: {
        patientUserId: userId,
        status: { in: ["CALLED", "IN_PROGRESS", "DONE"] },
      },
      select: {
        volunteer: {
          select: {
            professional: {
              select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
            },
            psychoanalyst: {
              select: { id: true, userId: true, firstName: true, lastName: true },
            },
            integrativeTherapist: {
              select: { id: true, userId: true, firstName: true, lastName: true },
            },
          },
        },
      },
    }),
  ]);

  for (const a of appts) addContact(contacts, a.professional);
  for (const e of jitEntries) addContact(contacts, e.session.professional);
  for (const f of favorites) addContact(contacts, f.professional);
  for (const m of sent) {
    if (m.receiver.role === "PROFESSIONAL") addContact(contacts, m.receiver.professionalProfile);
  }
  for (const m of received) {
    if (m.sender.role === "PROFESSIONAL") addContact(contacts, m.sender.professionalProfile);
  }
  for (const entry of humanitarianEntries) {
    const volunteer = entry.volunteer;
    if (!volunteer) continue;
    if (volunteer.professional) {
      addContact(contacts, volunteer.professional);
    } else if (volunteer.psychoanalyst) {
      addContact(contacts, { ...volunteer.psychoanalyst, specialty: "Psicanalista" });
    } else if (volunteer.integrativeTherapist) {
      addContact(contacts, { ...volunteer.integrativeTherapist, specialty: "Terapeuta integrativo" });
    }
  }

  const list = Array.from(contacts.values()).sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "pt")
  );

  return NextResponse.json({ contacts: list });
}
