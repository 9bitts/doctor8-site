import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";
import AnalysandDetailClient from "@/components/psychoanalyst/AnalysandDetailClient";

export default async function AnalysandDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PSYCHOANALYST") redirect("/patient");

  const userRow = await db.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });

  return (
    <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="animate-spin text-slate-400" /></div>}>
      <AnalysandDetailClient
        analysandId={params.id}
        timeZone={userRow?.timezone || DEFAULT_TIME_ZONE}
      />
    </Suspense>
  );
}
