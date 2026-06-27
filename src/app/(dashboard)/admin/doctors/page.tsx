// src/app/(dashboard)/admin/doctors/page.tsx
import { Suspense } from "react";
import { getAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import ProvidersAdminClient from "./ProvidersAdminClient";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDoctorsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/login");
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-slate-400" />
        </div>
      }
    >
      <ProvidersAdminClient />
    </Suspense>
  );
}
