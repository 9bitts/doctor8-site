import { getAngelSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AngelFollowUpClient from "@/components/humanitarian/AngelFollowUpClient";

export const dynamic = "force-dynamic";

export default async function AdminAngelPage() {
  const session = await getAngelSession();
  if (!session) redirect("/login");
  return <AngelFollowUpClient />;
}
