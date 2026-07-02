"use client";

import { useEffect, useState } from "react";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

/** Patient/user display time zone ? single source: GET /api/user/timezone */
export function useUserTimeZone(): string {
  const [timeZone, setTimeZone] = useState(DEFAULT_TIME_ZONE);

  useEffect(() => {
    let active = true;
    fetch("/api/user/timezone")
      .then((r) => r.json())
      .then((d) => {
        if (active && typeof d?.timezone === "string" && d.timezone) {
          setTimeZone(d.timezone);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return timeZone;
}
