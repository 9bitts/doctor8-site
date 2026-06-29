"use client";

import { useEffect, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { consumeAuthCallback } from "@/lib/auth-callback";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";
import { safePostLoginUrl } from "@/lib/role-home";
import { PATIENT_LOGIN } from "@/lib/auth-portals";
import {
  useLoginLang,
  LoginPageShell,
  LoginSuspenseFallback,
  waitForAuthenticatedSession,
  navigateAfterAuth,
} from "@/components/auth/login-shared";
import { AuthLogo } from "@/components/auth/auth-logo";

export default function CallbackPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const { t } = useLoginLang();

  useEffect(() => {
    let cancelled = false;

    async function finishCallback() {
      // Clear any OAuth signup-intent cookie left over from a registration flow.
      await fetch("/api/auth/oauth-intent", { method: "DELETE" }).catch(() => undefined);

      const session = await waitForAuthenticatedSession();
      if (cancelled) return;

      if (!session?.user?.role) {
        navigateAfterAuth(`${PATIENT_LOGIN}?error=SessionTimeout`);
        return;
      }

      // Route purely by the authenticated user's role. Honor a saved deep-link
      // callback only when the role is allowed to open it (safePostLoginUrl).
      const savedCallback = consumeAuthCallback();
      navigateAfterAuth(
        safePostLoginUrl(
          session.user.role,
          savedCallback,
          resolvePatientPostLoginUrl,
          session.user.professionalSpecialty,
        ),
      );
    }

    finishCallback().catch(() => {
      if (!cancelled) {
        navigateAfterAuth(`${PATIENT_LOGIN}?error=SessionTimeout`);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

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
