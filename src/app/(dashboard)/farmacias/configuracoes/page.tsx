import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPharmacyStoreMembership, isPharmacyStoreActive } from "@/lib/pharmacy-store-auth";
import PharmacyStoreSettingsClient from "@/components/pharmacy-store/PharmacyStoreSettingsClient";

export default async function FarmaciasConfiguracoesPage() {
  const session = await auth();
  if (!session?.user) redirect("/farmacias/login");

  let readOnly = false;
  if (session.user.role === "PHARMACY_STORE") {
    const membership = await getPharmacyStoreMembership(session.user.id);
    readOnly = membership ? !isPharmacyStoreActive(membership.pharmacyStore.status) : true;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Endereço e opções da sua farmácia na rede Doctor8.</p>
      </div>
      <PharmacyStoreSettingsClient readOnly={readOnly} />
    </div>
  );
}
