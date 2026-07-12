"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Stethoscope } from "lucide-react";
import { buildLoginHref } from "@/lib/auth-portals";
import { OCCUPATIONAL_PHYSICIAN_LOGIN } from "@/lib/occupational-physician-portal";
import { ROLE_CONFLICT_CODE } from "@/lib/portal-invite-compat";

export default function AcceptOccupationalPhysicianInvitePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [status, setStatus] = useState<"loading" | "error" | "done">("loading");
  const [message, setMessage] = useState("");
  const [roleConflict, setRoleConflict] = useState(false);

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
          if (res.status === 409 && data.code === ROLE_CONFLICT_CODE) {
            setRoleConflict(true);
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
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center max-w-md space-y-4">
          <Stethoscope className="mx-auto text-teal-400 mb-4" size={40} />
          <p className="text-white">{message}</p>
          {roleConflict ? (
            <div className="text-sm text-slate-300 space-y-2">
              <p>
                Para acessar o portal de médico do trabalho, crie uma conta com outro e-mail
                ou peça um novo convite para um endereço dedicado.
              </p>
              <Link href="/login" className="text-teal-400 hover:underline block">
                Ir para login geral
              </Link>
            </div>
          ) : (
            <Link href={buildLoginHref(OCCUPATIONAL_PHYSICIAN_LOGIN)} className="text-teal-400 text-sm hover:underline">
              Ir para login médico
            </Link>
          )}
        </div>
      </div>
    );
  }

  return null;
}
