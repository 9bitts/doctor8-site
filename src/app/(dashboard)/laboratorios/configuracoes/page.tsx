import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLaboratoryMembership, isLaboratoryActive } from "@/lib/laboratory-auth";
import LaboratorySettingsClient from "@/components/laboratory/LaboratorySettingsClient";

export default async function LaboratoriosConfiguracoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/laboratorios/login");

  let readOnly = false;
  if (session.user.role === "LABORATORY") {
    const membership = await getLaboratoryMembership(session.user.id);
    readOnly = membership ? !isLaboratoryActive(membership.laboratory.status) : true;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Endereço, tipo de laboratório e dados de contato.</p>
      </div>
      <LaboratorySettingsClient readOnly={readOnly} />
    </div>
  );
}
