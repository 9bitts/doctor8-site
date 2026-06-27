"use client";

// Legacy room URL → unified video consult UI with patient chart sidebar.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

export default function RoomRedirectPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/room/${roomId}/token`);
        const data = await res.json();
        if (!alive) return;
        if (!res.ok) {
          setError(data.error || "Cannot access this room");
          return;
        }
        if (data.appointment?.id) {
          router.replace(`/video/${data.appointment.id}`);
          return;
        }
        setError("Appointment not found for this room.");
      } catch {
        if (alive) setError("Failed to connect. Please refresh the page.");
      }
    })();
    return () => { alive = false; };
  }, [roomId, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center">
          <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">Cannot join room</h2>
          <p className="text-slate-400 mb-6">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-emerald-400" />
    </div>
  );
}
