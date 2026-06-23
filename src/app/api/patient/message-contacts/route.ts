// GET — professionals a patient can start a conversation with.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
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
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ contacts: [] });

  const contacts = new Map<string, Contact>();

  const [appts, jitEntries, favorites, sent, received] = await Promise.all([
    db.appointment.findMany({
      where: {
        patientId: patient.id,
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
        patientUserId: session.user.id,
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
      where: { patientUserId: session.user.id },
      select: {
        professional: {
          select: { id: true, userId: true, firstName: true, lastName: true, specialty: true },
        },
      },
    }),
    db.message.findMany({
      where: { senderId: session.user.id, deletedAt: null },
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
      where: { receiverId: session.user.id, deletedAt: null },
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

  const list = Array.from(contacts.values()).sort((a, b) =>
    `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, "pt")
  );

  return NextResponse.json({ contacts: list });
}
