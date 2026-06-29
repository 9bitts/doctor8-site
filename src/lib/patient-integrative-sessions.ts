import { db } from "@/lib/db";
import { safeDecrypt } from "@/lib/integrative-therapist-api";
import {
  parseIntegrativeNoteContent,
} from "@/lib/pics/consult-templates";
import {
  generatePatientHandout,
  handoutHasContent,
} from "@/lib/pics/patient-orientation";
import { picBySlug, picLabel } from "@/lib/pics/practices";
import type { Lang } from "@/lib/i18n/translations";

export type PatientIntegrativeSession = {
  id: string;
  title: string;
  createdAt: string;
  sharedAt: string;
  therapistName: string;
  practiceSlug: string | null;
  practiceLabel: string | null;
  visitType: "first" | "return" | null;
  handout: string | null;
  hasHandout: boolean;
};

export async function getPatientIntegrativeSessions(
  patientUserId: string,
  lang: Lang,
): Promise<PatientIntegrativeSession[]> {
  const shares = await db.sharedRecord.findMany({
    where: { sharedWithUserId: patientUserId },
    include: {
      document: {
        include: {
          integrativeTherapist: { select: { firstName: true, lastName: true } },
          integrativeClientRecord: { select: { firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const sessions: PatientIntegrativeSession[] = [];

  for (const share of shares) {
    const doc = share.document;
    if (!doc?.integrativeTherapistId || doc.type !== "CLINICAL_NOTE") continue;

    const parsed = parseIntegrativeNoteContent(safeDecrypt(doc.content));
    const clientName = doc.integrativeClientRecord
      ? `${safeDecrypt(doc.integrativeClientRecord.firstName)} ${safeDecrypt(doc.integrativeClientRecord.lastName)}`.trim()
      : "";

    const practiceSlug = parsed.practiceSlug || null;
    let handout: string | null = null;

    if (practiceSlug && parsed.structured) {
      const canHandout = handoutHasContent({
        practiceSlug,
        structured: parsed.structured,
      });
      if (canHandout) {
        handout = generatePatientHandout({
          practiceSlug,
          structured: parsed.structured,
          lang,
          clientName,
          visitType: parsed.visitType ?? undefined,
        });
      }
    }

    const therapist = doc.integrativeTherapist;
    const therapistName = therapist
      ? `${safeDecrypt(therapist.firstName)} ${safeDecrypt(therapist.lastName)}`.trim()
      : "";

    const practice = practiceSlug ? picBySlug(practiceSlug) : undefined;

    sessions.push({
      id: doc.id,
      title: safeDecrypt(doc.title),
      createdAt: doc.createdAt.toISOString(),
      sharedAt: share.createdAt.toISOString(),
      therapistName,
      practiceSlug,
      practiceLabel: practice ? picLabel(practice, lang) : practiceSlug,
      visitType: parsed.visitType,
      handout,
      hasHandout: !!handout,
    });
  }

  return sessions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}
