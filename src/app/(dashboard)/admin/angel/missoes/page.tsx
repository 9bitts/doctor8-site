import { getAngelSession } from "@/lib/admin";
import { ANGEL_LOGIN } from "@/lib/auth-portals";
import { redirect } from "next/navigation";
import AngelMissionsClient from "@/components/humanitarian/AngelMissionsClient";

export const dynamic = "force-dynamic";

export default async function AdminAngelMissoesPage() {
  const session = await getAngelSession();
  if (!session) redirect(`${ANGEL_LOGIN}?callbackUrl=${encodeURIComponent("/admin/angel/missoes")}`);
  return <AngelMissionsClient />;
}
