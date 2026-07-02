"use client";

import { useEffect } from "react";
import {
  humanitarianReturnPathFromPathname,
  setHumanitarianOriginCookies,
} from "@/lib/humanitarian/origin-cookie";

/** Marks SOS / humanitarian patient entry with short-lived origin cookies. */
export default function HumanitarianOriginMarker({ returnPath }: { returnPath?: string }) {
  useEffect(() => {
    const path =
      returnPath
      ?? humanitarianReturnPathFromPathname(window.location.pathname);
    if (path) setHumanitarianOriginCookies(path);
  }, [returnPath]);

  return null;
}
