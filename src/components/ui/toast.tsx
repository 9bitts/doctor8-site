"use client";
// src/components/ui/toast.tsx
// Global toast provider + useToast hook, built on @radix-ui/react-toast
// (already in package.json). Mounted in the dashboard layout; pages outside
// it (e.g. /urgent) can wrap themselves with <ToastProvider>.

import * as ToastPrimitive from "@radix-ui/react-toast";
import {
  createContext, useCallback, useContext, useMemo, useRef, useState,
} from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

interface ToastItem {
  id: number;
  kind: "success" | "error";
  message: string;
}

export interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
}

const noop: ToastApi = { success: () => {}, error: () => {} };
const ToastContext = createContext<ToastApi>(noop);

export function useToast(): ToastApi {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: "success" | "error", message: string) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      <ToastPrimitive.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((item) => (
          <ToastPrimitive.Root
            key={item.id}
            onOpenChange={(open) => {
              if (!open) setToasts((prev) => prev.filter((x) => x.id !== item.id));
            }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 flex items-start gap-3"
          >
            {item.kind === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle size={18} className="text-rose-500 shrink-0 mt-0.5" />
            )}
            <ToastPrimitive.Description className="text-sm text-slate-700 flex-1 min-w-0">
              {item.message}
            </ToastPrimitive.Description>
            <ToastPrimitive.Close className="text-slate-400 hover:text-slate-600 shrink-0" aria-label="Close">
              <X size={16} />
            </ToastPrimitive.Close>
          </ToastPrimitive.Root>
        ))}
        <ToastPrimitive.Viewport className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-[calc(100vw-32px)] sm:w-96 outline-none" />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}
