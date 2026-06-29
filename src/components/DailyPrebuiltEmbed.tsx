"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { DailyCall } from "@daily-co/daily-js";

export type DailyPrebuiltHandle = {
  leave: () => Promise<void>;
};

type Props = {
  url: string;
  token: string;
  className?: string;
  onError?: (message: string) => void;
};

const DailyPrebuiltEmbed = forwardRef<DailyPrebuiltHandle, Props>(function DailyPrebuiltEmbed(
  { url, token, className = "flex-1 w-full h-full min-h-[200px]", onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const [joining, setJoining] = useState(true);

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
      setJoining(true);
      try {
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
        if (!destroyed) setJoining(false);
      } catch (e) {
        if (!destroyed) {
          setJoining(false);
          onError?.(e instanceof Error ? e.message : "Could not join video room");
        }
      }
    }

    mount();

    return () => {
      destroyed = true;
      callRef.current = null;
      call?.destroy();
    };
  }, [url, token, onError]);

  useEffect(() => {
    function onPageHide() {
      void callRef.current?.leave();
    }
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {joining && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10 text-white text-sm">
          Connecting…
        </div>
      )}
    </div>
  );
});

export default DailyPrebuiltEmbed;
