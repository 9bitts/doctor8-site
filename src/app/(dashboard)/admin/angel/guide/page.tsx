import { getAngelSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AngelGuideClient from "@/components/humanitarian/AngelGuideClient";

export const dynamic = "force-dynamic";

export default async function AdminAngelGuidePage() {
  const session = await getAngelSession();
  if (!session) redirect("/login");
  return <AngelGuideClient />;
}
