import { getAdminSession } from "@/lib/admin";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import PatientDetailClient from "./PatientDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminPatientDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getAdminSession();
  if (!session) redirect("/login");

  const exists = await db.patientProfile.findUnique({
    where: { id: params.id },
    select: { id: true },
  });
  if (!exists) notFound();

  return <PatientDetailClient patientId={params.id} />;
}
