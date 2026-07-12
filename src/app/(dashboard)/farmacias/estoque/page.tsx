import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPharmacyStoreMembership, isPharmacyStoreActive } from "@/lib/pharmacy-store-auth";
import PharmacyInventoryClient from "@/components/pharmacy-store/PharmacyInventoryClient";

export default async function FarmaciasEstoquePage() {
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
        <h1 className="text-2xl font-bold text-slate-900">Estoque e preços</h1>
        <p className="text-slate-500 text-sm mt-1">
          Importe seu banco de dados ou cadastre medicamentos com preço de balcão.
        </p>
      </div>
      <PharmacyInventoryClient readOnly={readOnly} />
    </div>
  );
}
