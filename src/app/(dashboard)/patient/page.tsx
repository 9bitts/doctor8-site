// src/app/(dashboard)/patient/page.tsx
// Patient home dashboard (i18n: translated server-side from User.language)
// P1-e follow-up: shows a persistent banner at the top while the patient's
// registration data (name, address, date of birth) is incomplete, linking to
// the Account page where they complete it. The banner disappears once complete.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { decryptPatientFields, decrypt } from "@/lib/encryption";
import { translate, normalizeLang, localeOf, greetingKey, Lang } from "@/lib/i18n/translations";
import {
  Calendar, FileText, Pill, AlertCircle,
  Clock, ChevronRight, Heart, Activity, AlertTriangle,
} from "lucide-react";
import Link from "next/link";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export default async function PatientDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/professional");

  const userId = session.user.id;

  // Language for this user (server-side translation)
  const userRow = await db.user.findUnique({ where: { id: userId }, select: { language: true } });
  const lang: Lang = normalizeLang(userRow?.language);
  const t = (key: string) => translate(lang, key);
  const locale = localeOf(lang);

  // Load patient data
  const patient = await db.patientProfile.findUnique({
    where: { userId },
    include: {
      medications: {
        where: { active: true, flow: "CLINICAL" },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      appointments: {
        where: {
          scheduledAt: { gte: new Date() },
          status: { in: ["CONFIRMED", "PENDING"] },
        },
        orderBy: { scheduledAt: "asc" },
        take: 3,
        include: {
          professional: {
            select: { firstName: true, lastName: true, specialty: true, avatarUrl: true },
          },
        },
      },
      medicalDocuments: {
        orderBy: { createdAt: "desc" },
        take: 4,
      },
    },
  });

  if (!patient) redirect("/onboarding");

  await audit.viewRecord(userId, "PatientProfile", patient.id);

  const decrypted = decryptPatientFields(
    { firstName: patient.firstName, lastName: patient.lastName },
    ["firstName", "lastName"]
  );

  // ── Registration completeness (same rule as the prescription warning) ──
  // address counts as present when there is a street line OR a city.
  const hasName = !!(decrypted.firstName && decrypted.lastName);
  const hasDob = !!patient.dateOfBirth;
  const hasAddress = !!(safeDecrypt(patient.addressLine1) || (patient.city || ""));
  const profileIncomplete = !hasName || !hasDob || !hasAddress;

  const upcomingCount = patient.appointments.length;
  const medicationCount = patient.medications.length;
  const documentCount = patient.medicalDocuments.length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          {t(greetingKey())}, {decrypted.firstName} 👋
        </h1>
        <p className="text-slate-500 mt-1">{t("pdash.subtitle")}</p>
      </div>

      {/* P1-e: incomplete-registration banner (persistent until complete) */}
      {profileIncomplete && (
        <Link
          href="/patient/account"
          className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 hover:bg-amber-100 transition"
        >
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-900">{t("pdash.completeProfile.title")}</p>
            <p className="text-xs text-amber-700 mt-0.5">{t("pdash.completeProfile.text")}</p>
            <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-amber-900">
              {t("pdash.completeProfile.action")} <ChevronRight size={13} />
            </span>
          </div>
        </Link>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="text-blue-500" size={20} />}
          label={t("pdash.stat.upcoming")}
          value={upcomingCount}
          bg="bg-blue-50"
          href="/patient/appointments"
        />
        <StatCard
          icon={<Pill className="text-emerald-500" size={20} />}
          label={t("pdash.stat.medications")}
          value={medicationCount}
          bg="bg-emerald-50"
          href="/patient/medications"
        />
        <StatCard
          icon={<FileText className="text-violet-500" size={20} />}
          label={t("pdash.stat.documents")}
          value={documentCount}
          bg="bg-violet-50"
          href="/patient/documents"
        />
        <StatCard
          icon={<Heart className="text-rose-500" size={20} />}
          label={t("pdash.stat.healthScore")}
          value="—"
          bg="bg-rose-50"
          href="/patient/history"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Upcoming appointments */}
        <Section
          title={t("pdash.upcoming.title")}
          href="/patient/appointments"
          icon={<Calendar size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          {patient.appointments.length === 0 ? (
            <EmptyState
              icon={<Calendar size={28} className="text-slate-300" />}
              message={t("pdash.upcoming.empty")}
              action={t("pdash.upcoming.action")}
              href="/patient/appointments"
            />
          ) : (
            <div className="space-y-3">
              {patient.appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0">
                    {apt.professional.firstName.charAt(0)}{apt.professional.lastName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm">
                      Dr. {apt.professional.firstName} {apt.professional.lastName}
                    </p>
                    <p className="text-xs text-slate-500">{apt.professional.specialty}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-semibold text-slate-700">
                      {new Date(apt.scheduledAt).toLocaleDateString(locale, { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                      <Clock size={10} />
                      {new Date(apt.scheduledAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Active medications */}
        <Section
          title={t("pdash.meds.title")}
          href="/patient/medications"
          icon={<Pill size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          {patient.medications.length === 0 ? (
            <EmptyState
              icon={<Pill size={28} className="text-slate-300" />}
              message={t("pdash.meds.empty")}
              action={t("pdash.meds.action")}
              href="/patient/medications"
            />
          ) : (
            <div className="space-y-3">
              {patient.medications.map((med) => {
                const decryptedMed = decryptPatientFields(
                  { name: med.name, dosage: med.dosage || "", frequency: med.frequency || "" },
                  ["name", "dosage", "frequency"]
                );
                return (
                  <div
                    key={med.id}
                    className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
                      <Pill size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm truncate">{decryptedMed.name}</p>
                      <p className="text-xs text-slate-500">
                        {decryptedMed.dosage} · {decryptedMed.frequency}
                      </p>
                    </div>
                    <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium shrink-0">
                      {t("common.active")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Recent documents */}
        <Section
          title={t("pdash.docs.title")}
          href="/patient/documents"
          icon={<FileText size={16} />}
          viewAllLabel={t("common.viewAll")}
        >
          {patient.medicalDocuments.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} className="text-slate-300" />}
              message={t("pdash.docs.empty")}
              action={t("pdash.docs.action")}
              href="/patient/documents"
            />
          ) : (
            <div className="space-y-3">
              {patient.medicalDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                    <FileText size={18} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {doc.type.replace("_", " ")}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(doc.createdAt).toLocaleDateString(locale, {
                        month: "short", day: "numeric", year: "numeric"
                      })}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Quick actions */}
        <Section title={t("pdash.quick.title")} icon={<Activity size={16} />} viewAllLabel={t("common.viewAll")}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: t("pdash.quick.book"), icon: "📅", href: "/patient/appointments", color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
              { label: t("pdash.quick.export"), icon: "📄", href: "/api/patient/history/pdf", color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" },
              { label: t("pdash.quick.addMed"), icon: "💊", href: "/patient/medications", color: "bg-violet-50 hover:bg-violet-100 text-violet-700" },
              { label: t("pdash.quick.share"), icon: "🔗", href: "/patient/history/share", color: "bg-rose-50 hover:bg-rose-100 text-rose-700" },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl text-center transition font-medium text-sm ${action.color}`}
              >
                <span className="text-2xl">{action.icon}</span>
                {action.label}
              </Link>
            ))}
          </div>
        </Section>
      </div>

      {/* Privacy notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>{t("pdash.privacy.bold")}</strong> {t("pdash.privacy.text")}
        </p>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg, href }: {
  icon: React.ReactNode; label: string; value: string | number; bg: string; href: string;
}) {
  return (
    <Link href={href} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md transition block">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>{icon}</div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </Link>
  );
}

function Section({ title, href, icon, children, viewAllLabel }: {
  title: string; href?: string; icon: React.ReactNode; children: React.ReactNode; viewAllLabel: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2 text-slate-700 font-semibold text-sm">
          {icon}
          {title}
        </div>
        {href && (
          <Link href={href} className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1">
            {viewAllLabel} <ChevronRight size={14} />
          </Link>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function EmptyState({ icon, message, action, href }: {
  icon: React.ReactNode; message: string; action: string; href: string;
}) {
  return (
    <div className="text-center py-6">
      <div className="flex justify-center mb-3">{icon}</div>
      <p className="text-sm text-slate-500 mb-3">{message}</p>
      <Link href={href} className="text-xs text-emerald-600 hover:underline font-medium">{action} →</Link>
    </div>
  );
}
