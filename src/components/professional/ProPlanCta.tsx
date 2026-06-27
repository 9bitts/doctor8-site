"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ProPlan } from "@/lib/professional-landing-content";
import { readApiJson, apiErrorMessage } from "@/lib/api-client";

const CHECKOUT_CALLBACK = "/professional/account?subscribe=doctor-connection";

type Props = {
  plan: ProPlan;
  signup: string;
  featured?: boolean;
};

export default function ProPlanCta({ plan, signup, featured }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const baseClass = featured
    ? "bg-white text-brand-600 hover:bg-white/90"
    : "border-[1.5px] border-white/30 text-white hover:bg-white/10";

  async function handleCheckout() {
    setLoading(true);
    setError("");
    try {
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();

      if (!session?.user) {
        window.location.href = `/register/professional/signup?callbackUrl=${encodeURIComponent(CHECKOUT_CALLBACK)}`;
        return;
      }

      const res = await fetch("/api/payments/professional-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const parsed = await readApiJson<{ checkoutUrl?: string; error?: string }>(res);
      if (parsed.data?.checkoutUrl) {
        window.location.href = parsed.data.checkoutUrl;
        return;
      }

      const msg = apiErrorMessage(parsed, "N?o foi poss?vel iniciar o checkout.");
      setError(msg);
    } catch {
      setError("Erro de conex?o. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (plan.checkout) {
    return (
      <div>
        <button
          type="button"
          onClick={handleCheckout}
          disabled={loading}
          className={`block w-full rounded-[10px] py-3.5 text-center text-[15px] font-bold transition disabled:opacity-60 ${baseClass}`}
        >
          {loading ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 size={16} className="animate-spin" />
              ...
            </span>
          ) : (
            plan.cta
          )}
        </button>
        {error && <p className="mt-2 text-center text-xs text-rose-200">{error}</p>}
      </div>
    );
  }

  return (
    <Link
      href={plan.href ?? signup}
      className={`block w-full rounded-[10px] py-3.5 text-center text-[15px] font-bold transition ${baseClass}`}
    >
      {plan.cta}
    </Link>
  );
}
