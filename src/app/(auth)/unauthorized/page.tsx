"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { resolveRoleHome } from "@/lib/role-home";

export default function UnauthorizedPage() {
  const [home, setHome] = useState("/login");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        if (session?.user?.role) {
          setHome(
            resolveRoleHome(session.user.role, session.user.professionalSpecialty),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
          <ShieldAlert className="w-8 h-8 text-amber-400" />
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Acesso n?o permitido</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Esta ?rea ? de outro tipo de conta (paciente, m?dico, admin, etc.). Voc? foi
          redirecionado para o painel correto ? use o bot?o abaixo se ainda estiver aqui.
        </p>
        {loading ? (
          <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" />
        ) : (
          <div className="flex flex-col gap-3">
            <Link
              href={home}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition"
            >
              Ir para meu painel
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full text-slate-400 hover:text-white text-sm py-2 transition"
            >
              Sair e entrar com outra conta
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
