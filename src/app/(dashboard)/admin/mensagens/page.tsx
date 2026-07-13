import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminWhatsAppInboxClient from "@/components/admin/AdminWhatsAppInboxClient";

export const dynamic = "force-dynamic";

export default async function AdminMensagensPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return <AdminWhatsAppInboxClient adminUserId={session.user.id!} />;
}
