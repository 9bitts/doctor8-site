"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  waitForAuthenticatedSession,
  navigateAfterAuth,
} from "@/components/auth/login-shared";
import { AuthLogo } from "@/components/auth/auth-logo";

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
  const searchParams = useSearchParams();
  const portal = searchParams.get("portal");
  const { t } = useLoginLang();

  useEffect(() => {
    let cancelled = false;

    async function finishOAuthCallback() {
      await fetch("/api/auth/oauth-intent", { method: "DELETE" }).catch(() => undefined);

      const session = await waitForAuthenticatedSession();
      if (cancelled) return;

      if (!session?.user?.role) {
        navigateAfterAuth(MAIN_LOGIN);
        return;
      }

      const savedCallback = consumeAuthCallback();
      if (savedCallback) {
        navigateAfterAuth(
          safePostLoginUrl(
            session.user.role,
            savedCallback,
            resolvePatientPostLoginUrl,
            session.user.professionalSpecialty,
          ),
        );
        return;
      }

      if (session.user.role === "PROFESSIONAL") {
        navigateAfterAuth(await resolveProfessionalHome(portal));
        return;
      }

      if (session.user.role === "ADMIN") {
        navigateAfterAuth("/admin");
        return;
      }

      navigateAfterAuth(
        resolveRoleHome(session.user.role, session.user.professionalSpecialty),
      );
    }

    finishOAuthCallback().catch(() => {
      if (!cancelled) navigateAfterAuth(MAIN_LOGIN);
    });

    return () => {
      cancelled = true;
    };
  }, [portal]);

  return (
    <LoginPageShell accent="emerald">
      <div className="text-center py-16">
        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" aria-hidden />
        </div>
        <AuthLogo className="h-10 w-auto mx-auto mix-blend-screen mb-4" />
        <p className="text-slate-400 text-sm" role="status">
          {t("login.callbackSigningIn")}
        </p>
      </div>
    </LoginPageShell>
  );
}
