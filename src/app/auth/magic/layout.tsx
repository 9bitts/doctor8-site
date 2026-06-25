import { Suspense } from "react";
import MagicLinkPage from "./page";

export default function MagicLinkLayout() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
          Carregando?
        </div>
      }
    >
      <MagicLinkPage />
    </Suspense>
  );
}
