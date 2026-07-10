"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ProviderIncompleteRegistrationCard from "@/components/ProviderIncompleteRegistrationCard";
import ProviderVerificationBanner from "@/components/ProviderVerificationBanner";
import {
  isProviderDashboardAlertRole,
  isProviderSettingsPath,
  resolveProviderSettingsHref,
} from "@/lib/provider-registration-complete";

import type { RegistrationChecklistKey } from "@/lib/provider-registration-complete";

type RegistrationStatus = {
  applicable: boolean;
  complete: boolean;
  verified?: boolean;
  checklist?: Partial<Record<RegistrationChecklistKey, boolean>>;
  missing?: RegistrationChecklistKey[];
};

type ConnectPromptState = {
  enabled: boolean;
  active: boolean;
};

export default function ProviderDashboardAlerts({ role }: { role: string }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [connectPrompt, setConnectPrompt] = useState<ConnectPromptState | null>(null);

  useEffect(() => {
    if (!isProviderDashboardAlertRole(role)) {
      setStatus(null);
      setConnectPrompt(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/user/registration-status");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        /* ignore */
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [role, pathname]);

  useEffect(() => {
    if (role !== "PROFESSIONAL" || status?.complete) {
      setConnectPrompt(null);
      return;
    }

    let cancelled = false;

    async function loadConnect() {
      try {
        const res = await fetch("/api/professional/onboarding-status");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setConnectPrompt({
            enabled: Boolean(data.stripeConnectEnabled),
            active: Boolean(data.hasStripeConnect),
          });
        }
      } catch {
        /* ignore */
      }
    }

    void loadConnect();
    return () => {
      cancelled = true;
    };
  }, [role, status?.complete]);

  if (!status?.applicable || isProviderSettingsPath(pathname, role)) return null;

  const settingsHref = resolveProviderSettingsHref(role, pathname);

  if (!status.complete) {
    return (
      <ProviderIncompleteRegistrationCard
        settingsHref={settingsHref}
        checklist={status.checklist}
        missing={status.missing}
        showStripeConnect={Boolean(connectPrompt?.enabled && !connectPrompt?.active)}
      />
    );
  }

  if (!status.verified) {
    return (
      <div className="mb-6">
        <ProviderVerificationBanner settingsHref={settingsHref} />
      </div>
    );
  }

  return null;
}
