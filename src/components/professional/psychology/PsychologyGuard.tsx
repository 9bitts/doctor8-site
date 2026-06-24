"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function PsychologyGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ok" | "denied">("loading");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/professional/profile");
        const data = await res.json();
        const specialty = data.profile?.specialty || "";
        const psychology = [
          "Psychologist", "Psychoanalyst", "Neuropsychologist", "Psychotherapist", "Behavioral Therapist",
        ].includes(specialty);
        if (!psychology) {
          setStatus("denied");
          router.replace("/professional");
        } else {
          setStatus("ok");
        }
      } catch {
        setStatus("denied");
        router.replace("/professional");
      }
    })();
  }, [router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="animate-spin text-brand-500" size={32} />
      </div>
    );
  }
  if (status === "denied") return null;
  return <>{children}</>;
}
