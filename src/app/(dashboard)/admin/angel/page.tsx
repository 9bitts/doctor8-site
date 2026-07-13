import { getAngelSession } from "@/lib/admin";
import { ANGEL_LOGIN } from "@/lib/auth-portals";
import { redirect } from "next/navigation";
import AngelFollowUpClient from "@/components/humanitarian/AngelFollowUpClient";

export const dynamic = "force-dynamic";

export default async function AdminAngelPage() {
  const session = await getAngelSession();
  if (!session) redirect(`${ANGEL_LOGIN}?callbackUrl=${encodeURIComponent("/admin/angel")}`);
  return <AngelFollowUpClient />;
}
