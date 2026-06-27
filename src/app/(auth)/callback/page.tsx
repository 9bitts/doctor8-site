"use client";

// src/app/(auth)/callback/page.tsx
// Post-OAuth redirect page — clears the signup_role cookie, checks session role,
// and redirects to the right dashboard.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { consumeAuthCallback } from "@/lib/auth-callback";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/oauth-intent", { method: "DELETE" }).catch(() => undefined);

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        const savedCallback = consumeAuthCallback();
        if (savedCallback) {
          const role = session?.user?.role;
          router.replace(
            role === "PATIENT"
              ? resolvePatientPostLoginUrl(savedCallback)
              : savedCallback,
          );
          return;
        }
        if (session?.user?.role === "PROFESSIONAL") {
          router.replace("/professional");
        } else if (session?.user?.role === "PSYCHOANALYST") {
          router.replace("/psychoanalyst");
        } else if (session?.user?.role === "INTEGRATIVE_THERAPIST") {
          router.replace("/integrative-therapist");
        } else if (session?.user?.role === "ANGEL") {
          router.replace("/humanitarian/angel");
        } else {
          router.replace("/patient");
        }
      })
      .catch(() => router.replace("/patient"));
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">
          Doctor<span className="text-emerald-400">8</span>
        </h1>
        <p className="text-slate-400 text-sm">Signing you in...</p>
      </div>
    </div>
  );
}
