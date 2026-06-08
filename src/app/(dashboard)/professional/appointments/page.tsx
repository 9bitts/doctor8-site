// src/app/(dashboard)/professional/appointments/page.tsx
// Professional's full appointment list

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { Calendar, Video, MapPin } from "lucide-react";
import { format } from "date-fns";

export default async function ProfessionalAppointments() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) redirect("/onboarding");

  const appointments = await db.appointment.findMany({
    where: { professionalId: professional.id },
    include: {
      patient: { select: { firstName: true, lastName: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: 100,
  });

  await audit.viewRecord(session.user.id, "Appointment", "list");

  const statusColors: Record<string, string> = {
    CONFIRMED: "bg-emerald-100 text-emerald-700",
    PENDING: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-blue-100 text-blue-700",
    CANCELLED: "bg-rose-100 text-rose-700",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
        <p className="text-slate-500 mt-1">All your consultations</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {appointments.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="mx-auto text-slate-300 mb-3" size={40} />
            <p className="text-slate-400 text-sm">No appointments yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointments.map((apt) => (
              <div key={apt.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition">
                <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm shrink-0">
                  {apt.patient.firstName[0]}{apt.patient.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">
                    {apt.patient.firstName} {apt.patient.lastName}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    {apt.type === "TELECONSULT" ? (
                      <><Video size={12} /> Teleconsultation</>
                    ) : (
                      <><MapPin size={12} /> In-person</>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold text-slate-700">
                    {format(new Date(apt.scheduledAt), "MMM d, yyyy")}
                  </p>
                  <p className="text-xs text-slate-500">
                    {format(new Date(apt.scheduledAt), "h:mm a")}
                  </p>
                </div>
                <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-lg ${statusColors[apt.status] || "bg-slate-100 text-slate-600"}`}>
                  {apt.status}
                </span>
                {apt.meetingUrl && apt.status === "CONFIRMED" && (
                  <a
                    href={apt.meetingUrl}
                    className="shrink-0 bg-emerald-500 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-1 hover:bg-emerald-400 transition"
                  >
                    <Video size={12} /> Join
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
