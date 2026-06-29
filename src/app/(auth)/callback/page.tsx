"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { consumeAuthCallback } from "@/lib/auth-callback";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";
import { resolveRoleHome, safePostLoginUrl } from "@/lib/role-home";
import { DOCTOR_LOGIN, PATIENT_LOGIN, PORTAL_LOGINS, PSYCHOLOGIST_LOGIN } from "@/lib/auth-portals";
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
  // Main /login (doctor portal) — always /professional; psychologists use /login/psicologo.
  if (!portal || portal === "doctor") {
    return "/professional";
  }

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
        const fallback =
          portal === "doctor" ? DOCTOR_LOGIN : PATIENT_LOGIN;
        navigateAfterAuth(`${fallback}?error=SessionTimeout`);
        return;
      }

      if (
        portal === "patient" &&
        session.user.role !== "PATIENT" &&
        session.user.role !== "ADMIN"
      ) {
        navigateAfterAuth(`${PATIENT_LOGIN}?error=WrongRole`);
        return;
      }

      if (
        portal === "doctor" &&
        session.user.role !== "PROFESSIONAL" &&
        session.user.role !== "ADMIN"
      ) {
        navigateAfterAuth(`${DOCTOR_LOGIN}?error=WrongRole`);
        return;
      }

      const portalConfig = portal
        ? PORTAL_LOGINS.find((p) => p.oauthPortal === portal)
        : undefined;
      if (
        portalConfig &&
        !portalConfig.allowedRoles.includes(session.user.role)
      ) {
        navigateAfterAuth(`${portalConfig.loginPath}?error=WrongRole`);
        return;
      }

      const savedCallback = consumeAuthCallback();
      if (savedCallback) {
        const specialty =
          portal === "psychologist" ? session.user.professionalSpecialty : null;
        navigateAfterAuth(
          safePostLoginUrl(
            session.user.role,
            savedCallback,
            resolvePatientPostLoginUrl,
            specialty,
          ),
        );
        return;
      }

      if (session.user.role === "PROFESSIONAL") {
        const dest = await resolveProfessionalHome(portal);
        if (portal === "psychologist" && dest === "/professional") {
          navigateAfterAuth(`${PSYCHOLOGIST_LOGIN}?error=WrongRole`);
          return;
        }
        navigateAfterAuth(dest);
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
      if (!cancelled) {
        const fallback =
          portal === "doctor" ? DOCTOR_LOGIN : PATIENT_LOGIN;
        navigateAfterAuth(`${fallback}?error=SessionTimeout`);
      }
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
