"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";

export default function PsychologistPortalRedirect() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const target = mapProfessionalPathToPortal("/psychologist", pathname);
    const qs = searchParams.toString();
    router.replace(qs ? `${target}?${qs}` : target);
  }, [pathname, searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-[40vh] text-slate-400 text-sm">
      <span className="inline-block w-5 h-5 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );
}
