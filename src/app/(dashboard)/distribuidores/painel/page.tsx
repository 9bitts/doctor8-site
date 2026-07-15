import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getDistributorMembership } from "@/lib/distributor-auth";
import { formatEin } from "@/lib/us-ein";
import { Package } from "lucide-react";

export default async function DistribuidoresPainelPage() {
  const session = await auth();
  if (!session?.user) redirect("/distribuidores/login");

  const membership = await getDistributorMembership(session.user.id);
  if (!membership && session.user.role !== "ADMIN") {
    redirect("/distribuidores/login");
  }

  const d = membership?.distributor;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600/20 text-sky-400">
          <Package size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {d?.tradeName || "Distributor portal"}
          </h1>
          <p className="text-sm text-slate-500">
            {d?.brandAlias ? `${d.brandAlias} · ` : ""}
            Doctor8 import network
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Legal name</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{d?.legalName || "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">EIN</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {d?.ein ? formatEin(d.ein) : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">{d?.status || "—"}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Platform fee</p>
          <p className="mt-1 font-semibold text-slate-900 dark:text-white">
            {d?.platformFeePercent ?? 15}%
          </p>
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-sky-500/30 bg-sky-500/5 p-5 text-sm text-slate-600 dark:text-slate-300">
        <p className="font-semibold text-slate-900 dark:text-white">Next steps</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Doctor8 reviews and activates your account.</li>
          <li>Connect Stripe US (Zephra) for product checkout — coming soon.</li>
          <li>Receive only Anvisa-authorized D2C orders with patient shipping address.</li>
        </ol>
      </div>
    </div>
  );
}
