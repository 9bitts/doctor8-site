"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import ProviderIncompleteRegistrationCard from "@/components/ProviderIncompleteRegistrationCard";
import ProviderVerificationBanner from "@/components/ProviderVerificationBanner";
import {
  isProviderSettingsPath,
  resolveProviderSettingsHref,
} from "@/lib/provider-registration-complete";
import { isVolunteerRole } from "@/lib/humanitarian/volunteer-eligibility";

type RegistrationStatus = {
  applicable: boolean;
  complete: boolean;
  verified: boolean;
};

export default function ProviderDashboardAlerts({ role }: { role: string }) {
  const pathname = usePathname();
  const [status, setStatus] = useState<RegistrationStatus | null>(null);

  useEffect(() => {
    if (!isVolunteerRole(role)) {
      setStatus(null);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/provider/registration-status");
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

  if (!status?.applicable || isProviderSettingsPath(pathname)) return null;

  const settingsHref = resolveProviderSettingsHref(role, pathname);

  if (!status.complete) {
    return <ProviderIncompleteRegistrationCard settingsHref={settingsHref} />;
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
