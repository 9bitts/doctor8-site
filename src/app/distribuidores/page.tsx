import Link from "next/link";
import { Package, LogIn, ArrowRight, Globe2, Truck } from "lucide-react";
import { DISTRIBUTOR_LOGIN, DISTRIBUTOR_REGISTER } from "@/lib/distributor-portal";

export const metadata = {
  title: "Doctor8 Distributors — US supplier portal",
  description:
    "Register your US distribution company to fulfill patient import orders on Doctor8 (Zephra and partners).",
};

export default function DistribuidoresLandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <div className="mb-10 flex items-center gap-3 text-sky-400">
          <Package size={28} />
          <span className="text-sm font-semibold tracking-wide uppercase">Doctor8 Distributors</span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Ship to Doctor8 patients in Brazil
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-slate-400">
          Portal for US suppliers (e.g. Zephra Clinical Peptide Systems). Register your company,
          wait for Doctor8 approval, then receive only Anvisa-cleared D2C orders.
        </p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={DISTRIBUTOR_REGISTER}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-6 py-3 font-semibold text-white hover:bg-sky-500"
          >
            Register distributor <ArrowRight size={18} />
          </Link>
          <Link
            href={DISTRIBUTOR_LOGIN}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-6 py-3 font-semibold text-slate-200 hover:border-slate-400"
          >
            <LogIn size={18} /> Sign in
          </Link>
        </div>

        <ul className="mt-14 grid gap-6 sm:grid-cols-3">
          <li className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <Globe2 className="mb-3 text-sky-400" size={22} />
            <h2 className="font-semibold">US onboarding</h2>
            <p className="mt-2 text-sm text-slate-400">EIN, legal name, and US address — built for American suppliers.</p>
          </li>
          <li className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <Package className="mb-3 text-sky-400" size={22} />
            <h2 className="font-semibold">Compliance gate</h2>
            <p className="mt-2 text-sm text-slate-400">Orders only after Anvisa authorization — no premature dispatch.</p>
          </li>
          <li className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <Truck className="mb-3 text-sky-400" size={22} />
            <h2 className="font-semibold">Direct to patient</h2>
            <p className="mt-2 text-sm text-slate-400">D2C fulfillment to the Brazilian home address on each order.</p>
          </li>
        </ul>
      </div>
    </div>
  );
}
