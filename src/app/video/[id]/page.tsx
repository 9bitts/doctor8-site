"use client";

// src/app/video/[id]/page.tsx
// Full-screen teleconsultation room.
// Embeds Daily Prebuilt via iframe — no extra npm package needed.
// The API validates who can join and the time window.

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Video, Clock, AlertCircle, ArrowLeft, ShieldCheck } from "lucide-react";

interface VideoData {
  url: string;
  token: string;
  userName: string;
  otherParty: string;
  scheduledAt: string;
  durationMins: number;
}

export default function VideoCallPage() {
  const params = useParams();
  const router = useRouter();
  const appointmentId = params.id as string;

  const [data, setData] = useState<VideoData | null>(null);
  const [error, setError] = useState("");
  const [opensAt, setOpensAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!appointmentId) return;
    fetchRoom();
  }, [appointmentId]);

  async function fetchRoom() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/video`);
      const d = await res.json();

      if (!res.ok) {
        if (d.error === "TOO_EARLY") {
          setOpensAt(d.opensAt);
          setError(d.message);
        } else {
          setError(d.message || d.error || "Could not open the video room.");
        }
        return;
      }
      setData(d);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Countdown until room opens
  useEffect(() => {
    if (!opensAt) return;
    const interval = setInterval(() => {
      const diff = new Date(opensAt).getTime() - Date.now();
      if (diff <= 0) {
        clearInterval(interval);
        setOpensAt(null);
        fetchRoom();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        h > 0
          ? `${h}h ${String(m).padStart(2, "0")}m`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [opensAt]);

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <Loader2 size={32} className="animate-spin text-emerald-400" />
        <p className="text-slate-400 text-sm">Preparing your consultation room...</p>
      </div>
    );
  }

  // ── Waiting room (too early) ──
  if (opensAt) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
            <Clock size={36} className="text-emerald-400" />
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Almost there!</h1>
          <p className="text-slate-400 text-sm mb-6">
            The room opens 10 minutes before your appointment.
          </p>
          <div className="bg-slate-800/60 rounded-2xl py-5 mb-6">
            <p className="text-xs text-slate-500 mb-1 uppercase tracking-wide">Room opens in</p>
            <p className="text-emerald-400 font-bold text-4xl tabular-nums">{countdown || "..."}</p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white text-sm font-medium flex items-center gap-2 mx-auto transition"
          >
            <ArrowLeft size={15} /> Back to appointments
          </button>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={36} className="text-red-400" />
          </div>
          <h1 className="text-white text-xl font-bold mb-2">Room unavailable</h1>
          <p className="text-slate-400 text-sm mb-8">{error}</p>
          <button
            onClick={() => router.back()}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={15} /> Go back
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ── Video room ──
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Video size={16} className="text-emerald-400" />
          </div>
          <div>
            <p className="text-white text-sm font-semibold">
              Consultation with {data.otherParty}
            </p>
            <p className="text-slate-500 text-xs">
              {new Date(data.scheduledAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              · {data.durationMins} min
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck size={13} className="text-emerald-500" />
          <span className="hidden sm:inline">Encrypted · HIPAA &amp; LGPD</span>
        </div>
      </div>

      {/* Daily Prebuilt iframe */}
      <iframe
        src={`${data.url}?t=${data.token}`}
        allow="camera; microphone; fullscreen; speaker; display-capture; autoplay"
        className="flex-1 w-full border-0"
        title="Teleconsultation"
      />
    </div>
  );
}
