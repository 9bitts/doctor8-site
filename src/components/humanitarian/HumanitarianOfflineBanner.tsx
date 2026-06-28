"use client";

import { useEffect, useState } from "react";
import { WifiOff, CloudOff } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";

export default function HumanitarianOfflineBanner({
  lang,
  draftRestored = false,
}: {
  lang: Lang;
  draftRestored?: boolean;
}) {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline && !draftRestored) return null;

  return (
    <div className="space-y-2">
      {draftRestored && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
          <CloudOff size={16} className="shrink-0 mt-0.5" />
          <span>{translate(lang, "hum.offline.draftRestored")}</span>
        </div>
      )}
      {offline && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          <WifiOff size={16} className="shrink-0 mt-0.5" />
          <span>{translate(lang, "hum.offline.noConnection")}</span>
        </div>
      )}
    </div>
  );
}
