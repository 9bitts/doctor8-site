"use client";

import { useCallback, useEffect, useState } from "react";
import type { RegistrationChecklistKey } from "@/lib/provider-registration-complete";
import type { PatientRegistrationFieldKey } from "@/lib/patient-registration-complete";

type ProviderChecklist = Record<RegistrationChecklistKey, boolean>;
type PatientChecklist = Record<PatientRegistrationFieldKey, boolean>;

export type RegistrationStatusResponse = {
  applicable: boolean;
  complete: boolean;
  verified?: boolean;
  checklist: ProviderChecklist | PatientChecklist | null;
  missing: string[];
  role?: string;
};

export function useRegistrationChecklist() {
  const [status, setStatus] = useState<RegistrationStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/user/registration-status");
      if (!res.ok) return;
      const data = await res.json();
      setStatus(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const providerChecklist =
    status?.checklist && "professionalData" in status.checklist
      ? (status.checklist as ProviderChecklist)
      : null;

  const patientChecklist =
    status?.checklist && "name" in status.checklist
      ? (status.checklist as PatientChecklist)
      : null;

  return {
    status,
    loading,
    refresh,
    providerChecklist,
    patientChecklist,
    registrationIncomplete: status?.applicable === true && status.complete === false,
  };
}
