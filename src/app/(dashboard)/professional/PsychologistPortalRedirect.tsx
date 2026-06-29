"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const PATH_MAP: [string, string][] = [
  ["/professional/psychology/compliance", "/psychologist/compliance"],
  ["/professional/psychology/documents", "/psychologist/documents"],
  ["/professional/psychology/scales", "/psychologist/scales"],
  ["/professional/psychology/sessions", "/psychologist/sessions"],
  ["/professional/psychology", "/psychologist"],
  ["/professional/settings/availability", "/psychologist/settings/availability"],
  ["/professional/settings", "/psychologist/settings"],
  ["/professional/patients", "/psychologist/patients"],
  ["/professional/shared", "/psychologist/shared"],
  ["/professional/categories", "/psychologist/categories"],
  ["/professional/appointments", "/psychologist/appointments"],
  ["/professional/resources", "/psychologist/resources"],
  ["/professional/financeiro", "/psychologist/financeiro"],
  ["/professional/messages", "/psychologist/messages"],
  ["/professional/account", "/psychologist/account"],
  ["/professional/doctor-connection", "/psychologist/doctor-connection"],
  ["/professional/jit", "/psychologist/jit"],
  ["/professional", "/psychologist"],
];

function mapProfessionalToPsychologist(pathname: string): string {
  for (const [from, to] of PATH_MAP) {
    if (pathname === from || pathname.startsWith(`${from}/`)) {
      return pathname.replace(from, to);
    }
  }
  return "/psychologist";
}

export default function PsychologistPortalRedirect() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const target = mapProfessionalToPsychologist(pathname);
    const qs = searchParams.toString();
    router.replace(qs ? `${target}?${qs}` : target);
  }, [pathname, searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-[40vh] text-slate-400 text-sm">
      ?
    </div>
  );
}
