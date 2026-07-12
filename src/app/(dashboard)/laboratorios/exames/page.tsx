import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getLaboratoryMembership, isLaboratoryActive } from "@/lib/laboratory-auth";
import LaboratoryExamCatalogClient from "@/components/laboratory/LaboratoryExamCatalogClient";

export default async function LaboratoriosExamesPage() {
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
        <h1 className="text-2xl font-bold text-slate-900">Exames e preços</h1>
        <p className="text-slate-500 text-sm mt-1">
          Importe sua tabela de exames ou cadastre manualmente — sangue, imagem ou ambos.
        </p>
      </div>
      <LaboratoryExamCatalogClient readOnly={readOnly} />
    </div>
  );
}
