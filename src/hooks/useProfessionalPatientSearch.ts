"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ImportablePatient, PlatformMatch } from "@/app/(dashboard)/professional/prescriptions/components/shared";

export type ProfessionalSearchRecord = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  hasAccount: boolean;
  missingForRx?: string[];
};

export type ProfessionalPatientSearchResult = {
  records: ProfessionalSearchRecord[];
  importable: ImportablePatient[];
  platformMatches: PlatformMatch[];
};

export function useProfessionalPatientSearch(options?: {
  apiBase?: string;
  debounceMs?: number;
  minPlatformChars?: number;
}) {
  const apiBase = options?.apiBase ?? "/api/professional";
  const debounceMs = options?.debounceMs ?? 250;
  const minPlatformChars = options?.minPlatformChars ?? 3;

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState<ProfessionalSearchRecord[]>([]);
  const [importable, setImportable] = useState<ImportablePatient[]>([]);
  const [platformMatches, setPlatformMatches] = useState<PlatformMatch[]>([]);
  const [requestingLinkId, setRequestingLinkId] = useState<string | null>(null);
  const [importingPatientId, setImportingPatientId] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/records/search?q=${encodeURIComponent(q)}`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        setRecords([]);
        setImportable([]);
        setPlatformMatches([]);
        return;
      }
      const data: ProfessionalPatientSearchResult = await res.json();
      setRecords(data.records || []);
      setImportable(data.importable || []);
      setPlatformMatches(data.platformMatches || []);
    } catch {
      setRecords([]);
      setImportable([]);
      setPlatformMatches([]);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, debounceMs);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, debounceMs, runSearch]);

  async function requestPatientLink(match: PlatformMatch) {
    setRequestingLinkId(match.patientUserId);
    try {
      const res = await fetch(`${apiBase}/patient-links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ patientUserId: match.patientUserId }),
      });
      if (res.ok) await runSearch(query);
    } finally {
      setRequestingLinkId(null);
    }
  }

  async function importPatient(item: ImportablePatient): Promise<ProfessionalSearchRecord | null> {
    setImportingPatientId(item.patientProfileId);
    try {
      const res = await fetch(`${apiBase}/records/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ patientProfileId: item.patientProfileId }),
      });
      const data = await res.json();
      if (res.ok) {
        await runSearch(query);
        return {
          id: data.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email ?? item.email,
          hasAccount: true,
          missingForRx: data.missingForRx,
        };
      }
      return null;
    } finally {
      setImportingPatientId(null);
    }
  }

  return {
    query,
    setQuery,
    loading,
    records,
    importable,
    platformMatches,
    minPlatformChars,
    requestingLinkId,
    importingPatientId,
    requestPatientLink,
    importPatient,
    refreshSearch: () => runSearch(query),
  };
}
