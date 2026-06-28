"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";

type Props = {
  lang?: Lang;
  dark?: boolean;
  draftRestored?: boolean;
};

export default function HumanitarianOfflineBanner({ lang = "es", dark = false, draftRestored = false }: Props) {
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
    <div
      className={
        dark
          ? "bg-amber-500/15 border border-amber-400/30 text-amber-100 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2"
          : "bg-amber-50 border border-amber-200 text-amber-900 text-sm px-4 py-2.5 rounded-xl flex items-center gap-2"
      }
      role="status"
    >
      <WifiOff size={16} className="shrink-0" />
      <span>
        {offline
          ? translate(lang, "hum.offline.banner")
          : translate(lang, "hum.offline.draftRestored")}
      </span>
    </div>
  );
}
