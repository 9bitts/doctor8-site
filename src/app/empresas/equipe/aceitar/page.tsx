"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Building2 } from "lucide-react";
import { EMPLOYER_LOGIN, buildLoginHref } from "@/lib/auth-portals";

export default function AcceptEmployerInvitePage() {
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
    fetch("/api/employer/invites/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            router.push(buildLoginHref(EMPLOYER_LOGIN, {
              callbackUrl: `/empresas/equipe/aceitar?token=${encodeURIComponent(token)}`,
            }));
            return;
          }
          setStatus("error");
          setMessage(data.error || "Não foi possível aceitar o convite.");
          return;
        }
        setStatus("done");
        router.push(data.redirectTo || "/empresas/painel");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Erro de conexão.");
      });
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="animate-spin text-sky-400" size={32} />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md">
          <Building2 className="mx-auto text-sky-400 mb-4" size={40} />
          <p className="text-white mb-4">{message}</p>
          <Link href={buildLoginHref(EMPLOYER_LOGIN)} className="text-sky-400 text-sm hover:underline">
            Ir para login
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
