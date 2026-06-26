import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export default function StaffRegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-900">
          <Loader2 className="animate-spin text-indigo-400" size={32} />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
