import { getAngelSession } from "@/lib/admin";
import { ANGEL_LOGIN } from "@/lib/auth-portals";
import { redirect } from "next/navigation";
import AngelProfileClient from "@/components/humanitarian/AngelProfileClient";

export const dynamic = "force-dynamic";

export default async function AdminAngelPerfilPage() {
  const session = await getAngelSession();
  if (!session) redirect(`${ANGEL_LOGIN}?callbackUrl=${encodeURIComponent("/admin/angel/perfil")}`);
  return <AngelProfileClient />;
}
