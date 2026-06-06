// src/app/share/[token]/page.tsx
// Public page for viewing a patient's shared medical record
// Accessed via a secure temporary link sent by the patient

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { decrypt } from "@/lib/encryption";
import { Shield, AlertTriangle, FileText, Pill, Calendar } from "lucide-react";

export default async function SharedRecordPage({ params }: { params: { token: string } }) {
  const shared = await db.sharedRecord.findUnique({
    where: { accessToken: params.token },
    include: {
      patient: {
        include: {
          medications: { where: { active: true, flow: "CLINICAL" } },
        },
      },
    },
  });

  if (!shared) notFound();

  // Check expiry
  const expired = shared.expiresAt && shared.expiresAt < new Date();

  // Mark as viewed
  if (!shared.viewedAt && !expired) {
    await db.sharedRecord.update({
      where: { id: shared.id },
      data: { viewedAt: new Date() },
    });
  }

  const patient = shared.patient;
  const firstName = decrypt(patient.firstName);
  const lastName = decrypt(patient.lastName);
  const allergies = patient.allergies ? decrypt(patient.allergies) : null;
  const conditions = patient.chronicConditions ? decrypt(patient.chronicConditions) : null;
  const notes = patient.notes ? (() => { try { return JSON.parse(decrypt(patient.notes!)); } catch { return null; } })() : null;

  const medications = patient.medications.map((m) => ({
    name: decrypt(m.name),
    dosage: m.dosage ? decrypt(m.dosage) : null,
    frequency: m.frequency ? decrypt(m.frequency) : null,
    prescribedBy: m.prescribedBy,
  }));

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-black text-slate-900">Doctor<span className="text-emerald-500">8</span></span>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Shield size={14} className="text-emerald-500" />
          HIPAA Protected
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {expired ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-800 mb-2">This link has expired</h2>
            <p className="text-red-600 text-sm">Ask the patient to generate a new share link.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <div className="flex items-start justify-between flex-wrap gap-4">
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">Patient</p>
                  <h1 className="text-2xl font-black text-slate-900">{firstName} {lastName}</h1>
                  {patient.bloodType && (
                    <span className="inline-block mt-2 bg-red-50 text-red-700 text-sm font-semibold px-3 py-1 rounded-full border border-red-200">
                      Blood type: {patient.bloodType}
                    </span>
                  )}
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Shared record</p>
                  <p>Viewed: {today}</p>
                  {shared.expiresAt && (
                    <p className="text-amber-600 font-medium mt-1">
                      Expires: {new Date(shared.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Allergies — highlighted */}
            {allergies && (
              <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={18} className="text-red-500" />
                  <h2 className="font-bold text-red-800">Allergies</h2>
                </div>
                <p className="text-red-700">{allergies}</p>
              </div>
            )}

            {/* Chronic conditions */}
            {conditions && (
              <Section title="Chronic Conditions" icon={<FileText size={16} />}>
                <p className="text-slate-700">{conditions}</p>
              </Section>
            )}

            {/* Extended history */}
            {notes && (
              <>
                {notes.pastSurgeries && (
                  <Section title="Past Surgeries & Hospitalizations" icon={<Calendar size={16} />}>
                    <p className="text-slate-700">{notes.pastSurgeries}</p>
                  </Section>
                )}
                {notes.familyHistory && (
                  <Section title="Family History" icon={<FileText size={16} />}>
                    <p className="text-slate-700">{notes.familyHistory}</p>
                  </Section>
                )}
                {notes.currentSymptoms && (
                  <Section title="Current Symptoms" icon={<FileText size={16} />}>
                    <p className="text-slate-700">{notes.currentSymptoms}</p>
                  </Section>
                )}
              </>
            )}

            {/* Active medications */}
            <Section title={`Active Medications (${medications.length})`} icon={<Pill size={16} />}>
              {medications.length === 0 ? (
                <p className="text-slate-400 text-sm">No active medications reported</p>
              ) : (
                <div className="space-y-3">
                  {medications.map((med, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                        <Pill size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 text-sm">{med.name}</p>
                        <p className="text-xs text-slate-500">
                          {[med.dosage, med.frequency].filter(Boolean).join(" · ")}
                        </p>
                        {med.prescribedBy && <p className="text-xs text-slate-400 mt-0.5">Prescribed by: {med.prescribedBy}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Disclaimer */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700">
              <strong>Disclaimer:</strong> This health information was self-reported by the patient and may not reflect a complete clinical history. This document is for reference only and does not replace a formal medical consultation.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100 bg-slate-50">
        <span className="text-slate-500">{icon}</span>
        <h2 className="font-semibold text-slate-800 text-sm">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}
