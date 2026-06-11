"use client";

// src/app/(dashboard)/patient/subscription/page.tsx
// Club Doctor — subscribe / view status / cancel.
// This first version focuses on the subscription itself + the 20% consultation discount.
// The full benefits panel (medication discounts, content, etc.) comes in a later step.

import { useState, useEffect } from "react";
import { Check, Loader2, ShieldCheck, Sparkles, X } from "lucide-react";

interface SubInfo {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

const ACTIVE = ["active", "trialing"];

export default function SubscriptionPage() {
  const [sub, setSub] = useState<SubInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/subscription");
      const d = await res.json();
      setSub(d.subscription || null);
    } catch {
      setSub(null);
    } finally {
      setLoading(false);
    }
  }

  async function subscribe() {
    setWorking(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/subscription", { method: "POST" });
      const d = await res.json();
      if (d.checkoutUrl) {
        window.location.href = d.checkoutUrl; // go to Stripe Checkout
      } else {
        setMsg(d.error || "Could not start checkout. Please try again.");
        setWorking(false);
      }
    } catch {
      setMsg("Connection error. Please try again.");
      setWorking(false);
    }
  }

  async function cancel() {
    if (!confirm("Cancel Club Doctor? You keep your benefits until the end of the current period.")) return;
    setWorking(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/subscription", { method: "DELETE" });
      const d = await res.json();
      if (res.ok) {
        setMsg("Your Club Doctor will cancel at the end of the current period.");
        await load();
      } else {
        setMsg(d.error || "Could not cancel. Please try again.");
      }
    } catch {
      setMsg("Connection error. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  const isActive = sub && ACTIVE.includes(sub.status);

  const benefits = [
    "20% off every consultation",
    "Access to the Doctor8 platform and all services",
    "Collective buying club — special conditions",
    "Discounts on medications and lab tests",
    "Educational talks, books and videos",
    "Technical support for the platform",
    "Privacy & compliance aligned with LGPD/GDPR",
  ];

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-16 flex justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Club Doctor</h1>
        <p className="text-slate-500 mt-1">
          Your membership unlocks a 20% discount on every consultation, plus exclusive benefits.
        </p>
      </div>

      {msg && (
        <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-xl px-4 py-3">
          {msg}
        </div>
      )}

      {/* Status card */}
      {isActive ? (
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">
              {sub!.cancelAtPeriodEnd ? "Active · cancelling" : "Active member"}
            </span>
          </div>
          <p className="text-3xl font-bold mb-2">Club Doctor</p>
          <p className="text-emerald-50 text-sm">
            {sub!.cancelAtPeriodEnd
              ? `Your benefits remain active until ${
                  sub!.currentPeriodEnd
                    ? new Date(sub!.currentPeriodEnd).toLocaleDateString()
                    : "the end of the period"
                }.`
              : sub!.currentPeriodEnd
              ? `Renews on ${new Date(sub!.currentPeriodEnd).toLocaleDateString()} · $10.00/month`
              : "$10.00/month"}
          </p>

          {!sub!.cancelAtPeriodEnd && (
            <button
              onClick={cancel}
              disabled={working}
              className="mt-6 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              {working ? <Loader2 className="animate-spin" size={15} /> : <X size={15} />}
              Cancel membership
            </button>
          )}
        </div>
      ) : (
        <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-lg">
          <div className="flex items-center gap-2 mb-1 text-emerald-400">
            <Sparkles size={18} />
            <span className="text-sm font-semibold uppercase tracking-wide">Membership</span>
          </div>
          <div className="flex items-end gap-1 mb-1">
            <span className="text-4xl font-bold">$10</span>
            <span className="text-slate-400 mb-1">/month</span>
          </div>
          <p className="text-slate-400 text-sm mb-6">Cancel anytime. Billed monthly in USD.</p>

          <button
            onClick={subscribe}
            disabled={working}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl transition flex items-center gap-2 w-full justify-center"
          >
            {working ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
            Join Club Doctor
          </button>
        </div>
      )}

      {/* Benefits */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="font-semibold text-slate-800 mb-4">What's included</h2>
        <ul className="space-y-3">
          {benefits.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-slate-700">
              <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={12} className="text-emerald-600" />
              </span>
              {b}
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-400 mt-5">
          Club Doctor is not health insurance and does not cover emergency care. Consultations are
          charged separately, before each appointment.
        </p>
      </div>
    </div>
  );
}
