import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin";
import AcuraVolunteersAdminPanel from "@/components/admin/AcuraVolunteersAdminPanel";

export const dynamic = "force-dynamic";

export default async function AdminAcuraVolunteersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Voluntários AcuraBrasil</h1>
        <p className="text-sm text-slate-500 mt-1">
          Contate apenas profissionais ativos nesta lista. O selo é concedido na aprovação.
        </p>
      </div>
      <AcuraVolunteersAdminPanel />
    </div>
  );
}
