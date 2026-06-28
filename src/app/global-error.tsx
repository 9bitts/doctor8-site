"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt">
      <body className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold">Algo deu errado</h1>
          <p className="text-slate-400 text-sm">
            Ocorreu um erro inesperado. Nossa equipe foi notificada se o monitoramento estiver ativo.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm"
          >
            Tentar novamente
          </button>
        </div>
      </body>
    </html>
  );
}
