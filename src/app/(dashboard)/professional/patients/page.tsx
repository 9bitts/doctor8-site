// src/app/(dashboard)/professional/patients/page.tsx
// Professional's patient list — derived from appointments

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { Users, Calendar } from "lucide-react";
import { format } from "date-fns";

export default async function ProfessionalPatients() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) redirect("/onboarding");

  // Get all appointments with their patients
  const appointments = await db.appointment.findMany({
    where: { professionalId: professional.id },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
    orderBy: { scheduledAt: "desc" },
  });

  await audit.viewRecord(session.user.id, "PatientProfile", "list");

  // Group by unique patient
  const patientsMap = new Map<
    string,
    { id: string; firstName: string; lastName: string; visits: number; lastVisit: Date }
  >();

  for (const apt of appointments) {
    const p = apt.patient;
    if (!patientsMap.has(p.id)) {
      patientsMap.set(p.id, {
        id: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        visits: 1,
        lastVisit: apt.scheduledAt,
      });
    } else {
      const existing = patientsMap.get(p.id)!;
      existing.visits += 1;
      if (apt.scheduledAt > existing.lastVisit) existing.lastVisit = apt.scheduledAt;
    }
  }

  const patients = Array.from(patientsMap.values());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Patients</h1>
        <p className="text-slate-500 mt-1">
          {patients.length} {patients.length === 1 ? "patient" : "patients"} total
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {patients.length === 0 ? (
          <div className="text-center py-16">
            <Users className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">No patients yet</p>
            <p className="text-slate-400 text-xs mt-1">
              Patients will appear here after their first appointment
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {patients.map((p) => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-emerald-600 text-sm shrink-0">
                  {p.firstName[0]}{p.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {p.firstName} {p.lastName}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <Calendar size={12} /> Last visit: {format(new Date(p.lastVisit), "MMM d, yyyy")}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-slate-700">{p.visits}</p>
                  <p className="text-xs text-slate-500">{p.visits === 1 ? "visit" : "visits"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
