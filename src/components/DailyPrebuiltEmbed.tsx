"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { DailyCall } from "@daily-co/daily-js";

export type DailyPrebuiltHandle = {
  leave: () => Promise<void>;
};

type Props = {
  url: string;
  token: string;
  className?: string;
};

const DailyPrebuiltEmbed = forwardRef<DailyPrebuiltHandle, Props>(function DailyPrebuiltEmbed(
  { url, token, className = "flex-1 w-full h-full min-h-[200px]" },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);

  useImperativeHandle(ref, () => ({
    leave: async () => {
      const call = callRef.current;
      if (!call) return;
      try {
        await call.leave();
        call.destroy();
      } catch {
        /* already left */
      }
      callRef.current = null;
    },
  }));

  useEffect(() => {
    let destroyed = false;
    let call: DailyCall | null = null;

    async function mount() {
      if (!containerRef.current) return;
      const DailyIframe = (await import("@daily-co/daily-js")).default;
      if (destroyed || !containerRef.current) return;

      call = DailyIframe.createFrame(containerRef.current, {
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "0",
          position: "absolute",
          inset: "0",
        },
        showLeaveButton: false,
      });
      callRef.current = call;
      await call.join({ url: `${url}?t=${token}` });
    }

    mount();

    return () => {
      destroyed = true;
      callRef.current = null;
      call?.destroy();
    };
  }, [url, token]);

  return <div ref={containerRef} className={`relative ${className}`} />;
});

export default DailyPrebuiltEmbed;
