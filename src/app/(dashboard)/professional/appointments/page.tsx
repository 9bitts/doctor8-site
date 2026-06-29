// src/app/(dashboard)/professional/appointments/page.tsx

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { translate, normalizeLang, localeOf, Lang } from "@/lib/i18n/translations";
import { Calendar, Video, MapPin, FileText, ClipboardList, Pill, FlaskConical, ScrollText } from "lucide-react";
import Link from "next/link";
import { chartActionUrl } from "@/lib/video-chart-nav";
import { parseAppointmentIntake } from "@/lib/appointment-intake";
import { decrypt } from "@/lib/encryption";
import { resolveProfessionalPortalBaseForUser } from "@/lib/psychologist-portal";
import AppointmentsAnchorClient from "@/components/professional/AppointmentsAnchorClient";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export default async function ProfessionalAppointments() {
  const session = await auth();
  if (!session?.user) redirect("/login/medico");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const userRow = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang: Lang = normalizeLang(userRow?.language);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) redirect("/onboarding");

  const portalBase = await resolveProfessionalPortalBaseForUser(session.user.id);
  const isPsychologistPortal = portalBase === "/psychologist";

  const appointments = await db.appointment.findMany({
    where: { professionalId: professional.id },
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  const patientProfiles = await db.patientProfile.findMany({
    where: { id: { in: appointments.map((a) => a.patientId) } },
    select: { id: true, userId: true },
  });
  const userIdByPatientProfileId = Object.fromEntries(
    patientProfiles.map((p) => [p.id, p.userId])
  );

  const linkedUserIds = [
    ...new Set(patientProfiles.map((p) => p.userId).filter(Boolean)),
  ] as string[];

  const charts = linkedUserIds.length
    ? await db.patientRecord.findMany({
        where: {
          professionalId: professional.id,
          linkedUserId: { in: linkedUserIds },
        },
        select: { id: true, linkedUserId: true },
      })
    : [];

  const chartIdByUserId = Object.fromEntries(
    charts.map((c) => [c.linkedUserId!, c.id])
  );

  await audit.viewRecord(session.user.id, "Appointment", "list");

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-brand-100 text-brand-600",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-brand-100 text-brand-600",
    CANCELLED: "bg-rose-100 text-rose-700",
  };

  const now = Date.now();
  const upcoming = appointments.filter(
    (a) =>
      a.status === "CONFIRMED" &&
      new Date(a.scheduledAt).getTime() >= now - 60 * 60 * 1000
  );
  const rest = appointments.filter((a) => !upcoming.includes(a));

  function renderRow(apt: (typeof appointments)[0], highlightIntake = false) {
    const firstName = safeDecrypt(apt.patient.firstName);
    const lastName = safeDecrypt(apt.patient.lastName);
    const intake = parseAppointmentIntake(apt.chiefComplaint);
    const patientUserId = userIdByPatientProfileId[apt.patientId];
    const chartId = patientUserId ? chartIdByUserId[patientUserId] : null;

    return (
      <div
        key={apt.id}
        id={`appt-${apt.id}`}
        className={`flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition scroll-mt-24 ${
          highlightIntake && intake?.visitReason ? "bg-amber-50/40" : ""
        } ${!apt.notes && apt.status === "COMPLETED" ? "ring-1 ring-inset ring-violet-100" : ""}`}
      >
        <div className="w-11 h-11 rounded-xl bg-brand-100 flex items-center justify-center font-bold text-brand-500 text-sm shrink-0">
          {firstName[0]}
          {lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {firstName} {lastName}
          </p>
          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
            {apt.type === "TELECONSULT" ? (
              <>
                <Video size={12} /> {t("proappt.teleconsult")}
              </>
            ) : (
              <>
                <MapPin size={12} /> {t("proappt.inPerson")}
              </>
            )}
          </p>
          {intake?.healthPlanLabel && (
            <p className="text-[11px] text-brand-600 mt-1">{intake.healthPlanLabel}</p>
          )}
          {intake?.serviceName && (
            <p className="text-[11px] text-slate-600 mt-1">{intake.serviceName}</p>
          )}
          {intake?.visitReason && (
            <div
              className={`mt-2 rounded-lg p-2 ${
                highlightIntake ? "bg-white border border-amber-200" : ""
              }`}
            >
              <p className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
                <ClipboardList size={10} /> {t("proappt.intakeLabel")}
              </p>
              <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-3">
                {intake.visitReason}
              </p>
            </div>
          )}
          {chartId && (
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                href={`${portalBase}/patients/${chartId}`}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:underline"
              >
                <FileText size={11} /> {t("proappt.viewChart")}
              </Link>
              {!isPsychologistPortal && (
                <>
                  <Link
                    href={chartActionUrl("/professional/prescriptions", chartId, {
                      view: "prescription",
                      returnUrl: `${portalBase}/appointments`,
                    })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg hover:bg-brand-100 transition"
                  >
                    <Pill size={11} /> {t("chartAct.prescribe")}
                  </Link>
                  <Link
                    href={chartActionUrl("/professional/prescriptions", chartId, {
                      view: "exam",
                      returnUrl: `${portalBase}/appointments`,
                    })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg hover:bg-brand-100 transition"
                  >
                    <FlaskConical size={11} /> {t("chartAct.exam")}
                  </Link>
                  <Link
                    href={chartActionUrl("/professional/prescriptions", chartId, {
                      view: "document",
                      returnUrl: `${portalBase}/appointments`,
                    })}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 bg-brand-50 border border-brand-100 px-2 py-0.5 rounded-lg hover:bg-brand-100 transition"
                  >
                    <ScrollText size={11} /> {t("chartAct.document")}
                  </Link>
                </>
              )}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-slate-700">
            {new Date(apt.scheduledAt).toLocaleDateString(locale, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(apt.scheduledAt).toLocaleTimeString(locale, {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg ${
            statusColors[apt.status] || "bg-slate-100 text-slate-600"
          }`}
        >
          {t(`status.${apt.status}`)}
        </span>
        {apt.type === "TELECONSULT" && apt.status === "CONFIRMED" && (
          <a
            href={`/video/${apt.id}`}
            className="shrink-0 bg-brand-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1 hover:bg-brand-400 transition"
          >
            <Video size={12} /> {t("proappt.join")}
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <AppointmentsAnchorClient />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("proappt.title")}</h1>
        <p className="text-slate-500 mt-1">{t("proappt.subtitle")}</p>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-100 bg-amber-50/60">
            <p className="text-sm font-semibold text-amber-900">{t("proappt.upcoming")}</p>
          </div>
          <div className="divide-y divide-slate-100">
            {upcoming.map((apt) => renderRow(apt, true))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {rest.length === 0 && upcoming.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">{t("proappt.empty")}</p>
          </div>
        ) : rest.length > 0 ? (
          <div className="divide-y divide-slate-100">{rest.map((apt) => renderRow(apt))}</div>
        ) : null}
      </div>
    </div>
  );
}
