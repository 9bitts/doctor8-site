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

async function destroyCallSafely(call: DailyCall | null): Promise<void> {
  if (!call) return;
  try {
    const stateFn = (call as DailyCall & { meetingState?: () => string }).meetingState;
    const state = typeof stateFn === "function" ? stateFn() : "";
    if (state === "joined-meeting") {
      try {
        await call.leave();
      } catch {
        /* already left */
      }
    }
  } catch {
    /* ignore state read errors */
  }
  try {
    await call.destroy();
  } catch {
    /* already destroyed */
  }
}

async function destroyWithTimeout(call: DailyCall | null, ms = 3000): Promise<void> {
  if (!call) return;
  const winner = await Promise.race([
    destroyCallSafely(call).then(() => "destroy" as const),
    new Promise<"timeout">((resolve) => setTimeout(() => resolve("timeout"), ms)),
  ]);
  if (winner === "timeout") console.log("[daily] destroy timed out");
}

const DailyPrebuiltEmbed = forwardRef<DailyPrebuiltHandle, Props>(function DailyPrebuiltEmbed(
  { url, token, className = "flex-1 w-full h-full min-h-[200px]", onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const callRef = useRef<DailyCall | null>(null);
  const onErrorRef = useRef(onError);
  const [joining, setJoining] = useState(true);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useImperativeHandle(ref, () => ({
    leave: async () => {
      const call = callRef.current;
      callRef.current = null;
      await destroyWithTimeout(call);
    },
  }));

  useEffect(() => {
    if (!url?.trim() || !token?.trim()) {
      setJoining(false);
      return;
    }

    let cancelled = false;
    let connectTimeout: ReturnType<typeof setTimeout> | null = null;

    const clearConnectTimeout = () => {
      if (connectTimeout) {
        clearTimeout(connectTimeout);
        connectTimeout = null;
      }
    };

    const markConnected = () => {
      if (!cancelled) {
        console.log("[daily] joined");
        clearConnectTimeout();
        setJoining(false);
      }
    };

    // Force-remove any leftover Daily iframe/instance so createFrame never
    // throws "Duplicate DailyIframe instances are not allowed".
    async function purgeExistingCall(DailyIframe: {
      getCallInstance?: () => DailyCall | null | undefined;
    }): Promise<void> {
      const existing = DailyIframe.getCallInstance?.();
      if (existing) {
        await destroyWithTimeout(existing);
      }
    }

    const reportError = (msg: string) => {
      if (!cancelled) {
        console.log("[daily] error", msg);
        clearConnectTimeout();
        setJoining(false);
        onErrorRef.current?.(msg);
      }
    };

    async function mount() {
      if (!containerRef.current || cancelled) return;
      setJoining(true);

      connectTimeout = setTimeout(() => {
        reportError("Connection timed out. Please retry.");
      }, 30_000);

      try {
        if (callRef.current) {
          const prev = callRef.current;
          callRef.current = null;
          await destroyWithTimeout(prev);
        }
        if (cancelled || !containerRef.current) return;

        const DailyIframe = (await import("@daily-co/daily-js")).default;
        if (cancelled || !containerRef.current) return;

        await purgeExistingCall(DailyIframe);
        if (cancelled || !containerRef.current) return;

        const frameOptions = {
          iframeStyle: {
            width: "100%",
            height: "100%",
            border: "0",
            position: "absolute",
            inset: "0",
          },
          showLeaveButton: false,
        };

        let call: DailyCall;
        try {
          call = DailyIframe.createFrame(containerRef.current, frameOptions);
        } catch (frameErr) {
          // Almost always "Duplicate DailyIframe instances are not allowed".
          // Purge the zombie instance once more and retry a single time.
          console.log("[daily] createFrame failed, retrying after purge", frameErr);
          await purgeExistingCall(DailyIframe);
          if (cancelled || !containerRef.current) return;
          call = DailyIframe.createFrame(containerRef.current, frameOptions);
        }
        callRef.current = call;

        // NOTE: do not treat "loaded" as connected — it fires when the iframe
        // shell loads, before the actual join, and would hide join failures.
        call.on("joined-meeting", markConnected);
        call.on("participant-joined", markConnected);
        call.on("left-meeting", () => {
          console.log("[daily] left");
          if (!cancelled) setJoining(false);
        });
        call.on("error", (ev: { errorMsg?: string; error?: { msg?: string } }) => {
          console.log("[daily] error event", ev);
          const msg =
            ev?.errorMsg || ev?.error?.msg || "Could not join video room";
          reportError(msg);
        });

        if (cancelled) return;

        await call.join({ url, token });

        if (cancelled) return;

        markConnected();
      } catch (e) {
        if (!cancelled) {
          reportError(e instanceof Error ? e.message : "Could not join video room");
        }
      }
    }

    void mount();

    return () => {
      cancelled = true;
      clearConnectTimeout();
      const instance = callRef.current;
      callRef.current = null;
      void destroyWithTimeout(instance);
    };
  }, [url, token]);

  useEffect(() => {
    function onPageHide() {
      void (async () => {
        const call = callRef.current;
        if (!call) return;
        try {
          await call.leave();
        } catch {
          /* ignore */
        }
      })();
    }
    window.addEventListener("pagehide", onPageHide);
    return () => window.removeEventListener("pagehide", onPageHide);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{ minHeight: 200 }}
    >
      {joining && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 z-10 text-white text-sm">
          Connecting…
        </div>
      )}
    </div>
  );
});

export default DailyPrebuiltEmbed;
