"use client";

// Recover from stale JS chunks after a deploy.
import { useEffect } from "react";

function isChunkLoadError(message: string): boolean {
  return (
    message.includes("ChunkLoadError") ||
    message.includes("Loading chunk") ||
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Cannot find module")
  );
}

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    const message = error?.message ?? "";
    if (!isChunkLoadError(message)) return;

    const key = "doctor8.chunk-reload";
    try {
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, "1");
        window.location.reload();
      } else {
        sessionStorage.removeItem(key);
      }
    } catch {
      window.location.reload();
    }
  }, [error]);

  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-semibold">Algo deu errado</h1>
          <p className="text-slate-400 text-sm">
            Houve um problema ao carregar a p&aacute;gina. Isso pode acontecer ap&oacute;s uma
            atualiza&ccedil;&atilde;o do sistema.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-emerald-500 hover:bg-emerald-400 text-white font-medium px-4 py-2 rounded-xl"
            >
              Recarregar p&aacute;gina
            </button>
            <button
              type="button"
              onClick={() => reset()}
              className="bg-white/10 hover:bg-white/15 text-white font-medium px-4 py-2 rounded-xl"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
