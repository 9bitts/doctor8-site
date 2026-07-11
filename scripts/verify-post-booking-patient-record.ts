#!/usr/bin/env npx tsx
/**
 * POST-BOOKING — PatientRecord always created on health booking; freemium bypass.
 *
 *   npx tsx scripts/verify-post-booking-patient-record.ts
 *   npx tsx scripts/verify-post-booking-patient-record.ts --db
 */
import assert from "node:assert/strict";
import {
  buildAppointmentIntakePayload,
  parseAppointmentIntake,
} from "../src/lib/appointment-intake";
import { shouldCreatePreConsultNote } from "../src/lib/post-booking";
import {
  PSYCHOLOGY_FREE_PATIENT_LIMIT,
  assertCanAddPsychologyPatient,
  countPsychologistPatients,
} from "../src/lib/psychology-plan-limits";

async function main() {
  console.log("[verify-post-booking-patient-record] unit checks…");

  assert.equal(shouldCreatePreConsultNote(null), false, "null intake → no note");
  assert.equal(
    shouldCreatePreConsultNote({
      visitReason: null,
      healthPlanSlug: "private",
      healthPlanLabel: "Private",
      serviceId: null,
      serviceName: null,
      policyAccepted: true,
    }),
    false,
    "empty visitReason → no note",
  );
  assert.equal(
    shouldCreatePreConsultNote({
      visitReason: "  ",
      healthPlanSlug: "private",
      healthPlanLabel: "Private",
      serviceId: null,
      serviceName: null,
      policyAccepted: true,
    }),
    false,
    "whitespace visitReason → no note",
  );
  assert.equal(
    shouldCreatePreConsultNote({
      visitReason: "Ansiedade",
      healthPlanSlug: "private",
      healthPlanLabel: "Private",
      serviceId: null,
      serviceName: null,
      policyAccepted: true,
    }),
    true,
    "non-empty visitReason → note",
  );

  const noReasonPayload = buildAppointmentIntakePayload({
    healthPlanSlug: "private",
    healthPlanLabel: "Private",
    policyAccepted: true,
  });
  assert.equal(shouldCreatePreConsultNote(parseAppointmentIntake(noReasonPayload)), false);

  const withReasonPayload = buildAppointmentIntakePayload({
    visitReason: "Insônia",
    healthPlanSlug: "private",
    healthPlanLabel: "Private",
    policyAccepted: true,
  });
  assert.equal(
    shouldCreatePreConsultNote(parseAppointmentIntake(withReasonPayload)),
    true,
  );

  assert.equal(
    3 + 1 > PSYCHOLOGY_FREE_PATIENT_LIMIT,
    true,
    "4th patient via manual add exceeds free limit",
  );
  assert.equal(
    PSYCHOLOGY_FREE_PATIENT_LIMIT,
    3,
    "free tier allows 3 patients for manual add",
  );

  if (process.argv.includes("--db")) {
    const { db } = await import("../src/lib/db");
    const { onAppointmentBooked } = await import("../src/lib/post-booking");

    console.log("[verify-post-booking-patient-record] DB integration checks…");

    const psychologist = await db.professionalProfile.findFirst({
      where: { specialty: { in: ["Psychologist", "Psicólogo"] } },
      select: { id: true, userId: true, specialty: true },
    });
    if (!psychologist) {
      console.warn("[skip] no psychologist profile in DB");
    } else {
      const existingCount = await countPsychologistPatients(psychologist.id);
      const manualGate = await assertCanAddPsychologyPatient(
        psychologist.userId,
        psychologist.id,
        psychologist.specialty,
      );
      if (existingCount >= PSYCHOLOGY_FREE_PATIENT_LIMIT) {
        assert.equal(manualGate.ok, false, "manual add blocked when at free limit");
      }

      const linkedIds = (
        await db.patientRecord.findMany({
          where: { professionalId: psychologist.id },
          select: { linkedUserId: true },
        })
      )
        .map((r) => r.linkedUserId)
        .filter(Boolean) as string[];

      const patientProfile = await db.patientProfile.findFirst({
        where: {
          userId: { not: psychologist.userId, notIn: linkedIds },
        },
        include: { user: { select: { email: true } } },
      });

      if (!patientProfile) {
        console.warn("[skip] no suitable patient profile for DB test");
      } else {
        const scheduledAt = new Date(Date.now() + 86400000);

        const appt = await db.appointment.create({
          data: {
            patientId: patientProfile.id,
            providerType: "HEALTH",
            professionalId: psychologist.id,
            scheduledAt,
            status: "CONFIRMED",
            priceAmount: 0,
            currency: "BRL",
            durationMins: 30,
          },
        });

        let chartIdToCleanup: string | null = null;

        try {
          const beforeCount = await countPsychologistPatients(psychologist.id);

          const noReason = await onAppointmentBooked({
            appointmentId: appt.id,
            providerType: "health",
            providerId: psychologist.id,
            patientUserId: patientProfile.userId,
            chiefComplaint: noReasonPayload,
            scheduledAt,
          });

          chartIdToCleanup = noReason.chartId;
          assert.ok(noReason.chartId, "health booking without visitReason creates PatientRecord");

          const docsAfterNoReason = await db.medicalDocument.count({
            where: { appointmentId: appt.id },
          });
          assert.equal(docsAfterNoReason, 0, "no pre-consult note without visitReason");

          const afterCount = await countPsychologistPatients(psychologist.id);
          assert.equal(afterCount, beforeCount + 1, "patient count increased by 1 via booking");

          if (beforeCount >= PSYCHOLOGY_FREE_PATIENT_LIMIT) {
            assert.ok(
              afterCount > PSYCHOLOGY_FREE_PATIENT_LIMIT,
              "free psychologist receives patient via booking beyond manual limit",
            );
          }

          const withReason = await onAppointmentBooked({
            appointmentId: appt.id,
            providerType: "health",
            providerId: psychologist.id,
            patientUserId: patientProfile.userId,
            chiefComplaint: withReasonPayload,
            scheduledAt,
          });

          assert.equal(withReason.chartId, noReason.chartId, "same chart on re-call");

          const docsAfterReason = await db.medicalDocument.count({
            where: { appointmentId: appt.id },
          });
          assert.equal(docsAfterReason, 1, "pre-consult note created when visitReason present");

          const record = await db.patientRecord.findUnique({
            where: { id: noReason.chartId! },
          });
          assert.ok(record, "PatientRecord exists");
          assert.equal(record!.linkedUserId, patientProfile.userId);
          assert.ok(record!.email, "email copied from profile");
        } finally {
          await db.medicalDocument.deleteMany({ where: { appointmentId: appt.id } }).catch(() => {});
          await db.appointment.delete({ where: { id: appt.id } }).catch(() => {});
          if (chartIdToCleanup) {
            await db.patientRecord.delete({ where: { id: chartIdToCleanup } }).catch(() => {});
          }
        }
      }
    }

    await db.$disconnect();
  }

  console.log("[verify-post-booking-patient-record] OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
