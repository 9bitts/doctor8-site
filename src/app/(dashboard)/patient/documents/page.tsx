// src/app/(dashboard)/patient/documents/page.tsx
// Patient's medical documents — prescriptions, exam results, certificates, etc.

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { decrypt } from "@/lib/encryption";
import { FileText, Download, Stethoscope, FlaskConical, Award, Share2, ClipboardList } from "lucide-react";
import { format } from "date-fns";

export default async function PatientDocuments() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PATIENT") redirect("/professional");

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!patient) redirect("/onboarding");

  const documents = await db.medicalDocument.findMany({
    where: { patientId: patient.id },
    include: {
      professional: { select: { firstName: true, lastName: true, specialty: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  await audit.viewRecord(session.user.id, "MedicalDocument", "list");

  const typeConfig: Record<string, { label: string; icon: React.ReactNode; bg: string }> = {
    PRESCRIPTION: { label: "Prescription", icon: <Stethoscope size={18} className="text-emerald-500" />, bg: "bg-emerald-50" },
    EXAM_REQUEST: { label: "Exam Request", icon: <FlaskConical size={18} className="text-blue-500" />, bg: "bg-blue-50" },
    EXAM_RESULT: { label: "Exam Result", icon: <FlaskConical size={18} className="text-violet-500" />, bg: "bg-violet-50" },
    CERTIFICATE: { label: "Certificate", icon: <Award size={18} className="text-amber-500" />, bg: "bg-amber-50" },
    REFERRAL: { label: "Referral", icon: <Share2 size={18} className="text-rose-500" />, bg: "bg-rose-50" },
    CLINICAL_NOTE: { label: "Clinical Note", icon: <ClipboardList size={18} className="text-slate-500" />, bg: "bg-slate-100" },
    OTHER: { label: "Document", icon: <FileText size={18} className="text-slate-500" />, bg: "bg-slate-100" },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Documents</h1>
        <p className="text-slate-500 mt-1">Your prescriptions, exam results and certificates</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {documents.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">No documents yet</p>
            <p className="text-slate-400 text-xs mt-1">
              Documents from your consultations will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {documents.map((doc) => {
              const cfg = typeConfig[doc.type] || typeConfig.OTHER;
              return (
                <div key={doc.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
                  <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                    {cfg.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">
                      {(() => { try { return decrypt(doc.title); } catch { return doc.title; } })()}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {cfg.label}
                      {doc.professional && ` · Dr. ${doc.professional.firstName} ${doc.professional.lastName}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-500">
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  {doc.fileUrl && (
                    <a
                      href={(() => { try { return decrypt(doc.fileUrl); } catch { return doc.fileUrl; } })()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-slate-400 hover:text-emerald-500 transition p-2 rounded-lg hover:bg-emerald-50"
                      aria-label="Download"
                    >
                      <Download size={18} />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
