"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Stethoscope } from "lucide-react";
import { buildLoginHref } from "@/lib/auth-portals";
import { OCCUPATIONAL_PHYSICIAN_LOGIN } from "@/lib/occupational-physician-portal";

export default function AcceptOccupationalPhysicianInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Token inválido.");
      return;
    }
    fetch("/api/occupational-physician/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            router.push(buildLoginHref(OCCUPATIONAL_PHYSICIAN_LOGIN, {
              callbackUrl: `/empresas/medico/aceitar?token=${encodeURIComponent(token)}`,
            }));
            return;
          }
          setStatus("error");
          setMessage(data.error || "Não foi possível aceitar o convite.");
          return;
        }
        setStatus("done");
        router.push(data.redirectTo || "/empresas/medico/painel");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Erro de conexão.");
      });
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-teal-400" size={32} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <Stethoscope className="mx-auto text-teal-400 mb-4" size={40} />
          <p className="text-white mb-4">{message}</p>
          <Link href={buildLoginHref(OCCUPATIONAL_PHYSICIAN_LOGIN)} className="text-teal-400 text-sm hover:underline">
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
