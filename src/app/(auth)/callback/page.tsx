"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { consumeAuthCallback } from "@/lib/auth-callback";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";
import { resolveRoleHome, safePostLoginUrl } from "@/lib/role-home";
import { MAIN_LOGIN } from "@/lib/auth-portals";
import { PSYCHOLOGIST_HOME, isPsychologistSpecialty } from "@/lib/psychologist-portal";
import {
  useLoginLang,
  LoginPageShell,
  LoginSuspenseFallback,
} from "@/components/auth/login-shared";

async function resolveProfessionalHome(portal: string | null): Promise<string> {
  const profRes = await fetch("/api/professional/profile");
  let specialty: string | null = null;
  if (profRes.ok) {
    const { profile } = await profRes.json();
    specialty = profile?.specialty ?? null;
    if (portal === "psychologist") {
      if (!profile?.specialty?.trim()) return "/onboarding?portal=psychologist";
      if (!isPsychologistSpecialty(profile.specialty)) return "/professional";
      return PSYCHOLOGIST_HOME;
    }
  }
  return resolveRoleHome("PROFESSIONAL", specialty);
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const portal = searchParams.get("portal");
  const { t } = useLoginLang();

  useEffect(() => {
    fetch("/api/auth/oauth-intent", { method: "DELETE" }).catch(() => undefined);

    fetch("/api/auth/session")
      .then((r) => r.json())
      .then(async (session) => {
        const savedCallback = consumeAuthCallback();
        if (savedCallback) {
          router.replace(
            safePostLoginUrl(
              session?.user?.role,
              savedCallback,
              resolvePatientPostLoginUrl,
              session?.user?.professionalSpecialty,
            ),
          );
          return;
        }
        if (session?.user?.role === "PROFESSIONAL") {
          router.replace(await resolveProfessionalHome(portal));
        } else if (session?.user?.role === "ADMIN") {
          router.replace("/admin");
        } else {
          router.replace(
            resolveRoleHome(session?.user?.role, session?.user?.professionalSpecialty),
          );
        }
      })
      .catch(() => router.replace(MAIN_LOGIN));
  }, [router, portal]);

  return (
    <LoginPageShell accent="emerald">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" aria-hidden />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">
          Doctor<span className="text-emerald-400">8</span>
        </h1>
        <p className="text-slate-400 text-sm" role="status">
          {t("login.callbackSigningIn")}
        </p>
      </div>
    </LoginPageShell>
  );
}
