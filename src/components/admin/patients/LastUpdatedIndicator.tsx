"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

export default function LastUpdatedIndicator({
  fetchedAt,
  loading,
}: {
  fetchedAt: string | null;
  loading: boolean;
}) {
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!fetchedAt) return;
    function tick() {
      setSecondsAgo(Math.floor((Date.now() - new Date(fetchedAt!).getTime()) / 1000));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
      <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
      {fetchedAt
        ? `Atualizado h? ${secondsAgo}s`
        : "Carregando..."}
    </span>
  );
}
