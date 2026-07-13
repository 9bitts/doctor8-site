import { Suspense } from "react";
import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminWhatsAppInboxClient from "@/components/admin/AdminWhatsAppInboxClient";

export const dynamic = "force-dynamic";

function InboxFallback() {
  return (
    <div className="max-w-6xl mx-auto py-20 text-center text-sm text-slate-400">
      …
    </div>
  );
}

export default async function AdminMensagensPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return (
    <Suspense fallback={<InboxFallback />}>
      <AdminWhatsAppInboxClient adminUserId={session.user.id!} />
    </Suspense>
  );
}
