import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import { getPharmacyStoreMembership, isPharmacyStoreActive } from "@/lib/pharmacy-store-auth";
import { canAccessPharmacyPharmacistPortal } from "@/lib/pharmacy-portal-guards";
import { db } from "@/lib/db";
import PharmacyStoreStatusBanner from "@/components/pharmacy-store/PharmacyStoreStatusBanner";

export default async function FarmaciasDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/farmacias/login");
  const role = session.user.role;

  if (role === "PHARMACY_STORE" || role === "ADMIN") {
    // allowed
  } else if (role === "PROFESSIONAL") {
    let specialty = session.user.professionalSpecialty ?? null;
    if (!specialty) {
      const profile = await db.professionalProfile.findUnique({
        where: { userId: session.user.id },
        select: { specialty: true },
      });
      specialty = profile?.specialty ?? null;
    }
    if (!canAccessPharmacyPharmacistPortal(role, specialty)) {
      redirect(resolveRoleHome(role, specialty));
    }
  } else {
    redirect(resolveRoleHome(role));
  }

  let storeStatus: string | null = null;
  if (role === "PHARMACY_STORE") {
    const membership = await getPharmacyStoreMembership(session.user.id);
    storeStatus = membership?.pharmacyStore.status ?? null;
  }

  return (
    <div className="space-y-6">
      {storeStatus && !isPharmacyStoreActive(storeStatus) && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <PharmacyStoreStatusBanner status={storeStatus} />
        </div>
      )}
      {children}
    </div>
  );
}
