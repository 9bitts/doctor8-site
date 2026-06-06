// src/app/(dashboard)/patient/page.tsx
// Patient home dashboard

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { decryptPatientFields, PHI_FIELDS } from "@/lib/encryption";
import {
  Calendar, FileText, Pill, AlertCircle,
  Clock, ChevronRight, Heart, Activity
} from "lucide-react";
import Link from "next/link";

export default async function PatientDashboard() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/professional");

  const userId = session.user.id;

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

  // Audit log — HIPAA: record dashboard access
  await audit.viewRecord(userId, "PatientProfile", patient.id);

  // Decrypt PHI fields
  const decrypted = decryptPatientFields(
    { firstName: patient.firstName, lastName: patient.lastName },
    ["firstName", "lastName"]
  );

  const upcomingCount = patient.appointments.length;
  const medicationCount = patient.medications.length;
  const documentCount = patient.medicalDocuments.length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Good morning, {decrypted.firstName} 👋
        </h1>
        <p className="text-slate-500 mt-1">Here&apos;s your health overview for today.</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Calendar className="text-blue-500" size={20} />}
          label="Upcoming appointments"
          value={upcomingCount}
          bg="bg-blue-50"
          href="/patient/appointments"
        />
        <StatCard
          icon={<Pill className="text-emerald-500" size={20} />}
          label="Active medications"
          value={medicationCount}
          bg="bg-emerald-50"
          href="/patient/medications"
        />
        <StatCard
          icon={<FileText className="text-violet-500" size={20} />}
          label="Documents"
          value={documentCount}
          bg="bg-violet-50"
          href="/patient/documents"
        />
        <StatCard
          icon={<Heart className="text-rose-500" size={20} />}
          label="Health score"
          value="—"
          bg="bg-rose-50"
          href="/patient/history"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">

        {/* Upcoming appointments */}
        <Section
          title="Upcoming appointments"
          href="/patient/appointments"
          icon={<Calendar size={16} />}
        >
          {patient.appointments.length === 0 ? (
            <EmptyState
              icon={<Calendar size={28} className="text-slate-300" />}
              message="No upcoming appointments"
              action="Book a consultation"
              href="/patient/appointments/new"
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
                      {new Date(apt.scheduledAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1 justify-end">
                      <Clock size={10} />
                      {new Date(apt.scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Active medications */}
        <Section
          title="Active medications"
          href="/patient/medications"
          icon={<Pill size={16} />}
        >
          {patient.medications.length === 0 ? (
            <EmptyState
              icon={<Pill size={28} className="text-slate-300" />}
              message="No active medications"
              action="Add medication"
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
                      Active
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Recent documents */}
        <Section
          title="Recent documents"
          href="/patient/documents"
          icon={<FileText size={16} />}
        >
          {patient.medicalDocuments.length === 0 ? (
            <EmptyState
              icon={<FileText size={28} className="text-slate-300" />}
              message="No documents yet"
              action="Upload a document"
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
                      {new Date(doc.createdAt).toLocaleDateString("en-US", {
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
        <Section title="Quick actions" icon={<Activity size={16} />}>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Book appointment", icon: "📅", href: "/patient/appointments/new", color: "bg-blue-50 hover:bg-blue-100 text-blue-700" },
              { label: "Export health record", icon: "📄", href: "/patient/history/export", color: "bg-emerald-50 hover:bg-emerald-100 text-emerald-700" },
              { label: "Add medication", icon: "💊", href: "/patient/medications", color: "bg-violet-50 hover:bg-violet-100 text-violet-700" },
              { label: "Share with doctor", icon: "🔗", href: "/patient/history/share", color: "bg-rose-50 hover:bg-rose-100 text-rose-700" },
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

      {/* HIPAA compliance notice */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
        <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>Your data is protected.</strong> All your health information is encrypted and stored securely
          in compliance with HIPAA (US) and GDPR (EU) regulations. Only you and professionals you authorize
          can access your records.
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

function Section({ title, href, icon, children }: {
  title: string; href?: string; icon: React.ReactNode; children: React.ReactNode;
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
            View all <ChevronRight size={14} />
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
