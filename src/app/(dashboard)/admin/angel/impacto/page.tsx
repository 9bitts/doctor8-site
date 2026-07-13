import { getAngelSession } from "@/lib/admin";
import { ANGEL_LOGIN } from "@/lib/auth-portals";
import { redirect } from "next/navigation";
import AngelImpactClient from "@/components/humanitarian/AngelImpactClient";

export const dynamic = "force-dynamic";

export default async function AdminAngelImpactoPage() {
  const session = await getAngelSession();
  if (!session) redirect(`${ANGEL_LOGIN}?callbackUrl=${encodeURIComponent("/admin/angel/impacto")}`);
  return <AngelImpactClient />;
}
