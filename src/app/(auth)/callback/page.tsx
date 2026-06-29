"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { consumeAuthCallback } from "@/lib/auth-callback";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";
import { resolveRoleHome } from "@/lib/role-home";
import { PSYCHOLOGIST_HOME } from "@/lib/psychologist-portal";

async function resolveProfessionalHome(portal: string | null): Promise<string> {
  if (portal !== "psychologist") return "/professional";
  const profRes = await fetch("/api/professional/profile");
  if (profRes.ok) {
    const { profile } = await profRes.json();
    if (!profile?.specialty?.trim()) return "/onboarding?portal=psychologist";
  }
  return PSYCHOLOGIST_HOME;
}

export default function CallbackPage() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = searchParams.get("portal");

  useEffect(() => {
    fetch("/api/auth/oauth-intent", { method: "DELETE" }).catch(() => undefined);

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (session) => {
        const savedCallback = consumeAuthCallback();
        if (savedCallback) {
          const role = session?.user?.role;
          router.replace(
            role === "PATIENT"
              ? resolvePatientPostLoginUrl(savedCallback)
              : role === "ADMIN"
                ? "/admin"
                : savedCallback,
          );
          return;
        }
        if (session?.user?.role === "PROFESSIONAL") {
          router.replace(await resolveProfessionalHome(portal));
        } else if (session?.user?.role === "ADMIN") {
          router.replace("/admin");
        } else {
          router.replace(resolveRoleHome(session?.user?.role));
        }
      })
      .catch(() => router.replace("/login"));
  }, [router, portal]);

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
