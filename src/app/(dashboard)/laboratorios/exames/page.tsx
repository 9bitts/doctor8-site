import LaboratoryExamCatalogClient from "@/components/laboratory/LaboratoryExamCatalogClient";

export default function LaboratoriosExamesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exames e preços</h1>
        <p className="text-slate-500 text-sm mt-1">
          Importe sua tabela de exames ou cadastre manualmente — sangue, imagem ou ambos.
        </p>
      </div>
      <LaboratoryExamCatalogClient />
    </div>
  );
}
