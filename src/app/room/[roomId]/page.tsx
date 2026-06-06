"use client";

// src/app/room/[roomId]/page.tsx
// Teleconsultation room — embeds Daily.co iframe
// Shown to both patient and professional during the call

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  MessageSquare, FileText, Loader2, AlertCircle,
  Clock, User, ChevronRight, Shield
} from "lucide-react";

interface RoomData {
  token: string;
  roomUrl: string;
  roomName: string;
  participantName: string;
  isOwner: boolean;
  appointment: {
    id: string;
    scheduledAt: string;
    durationMins: number;
  };
}

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const callFrameRef = useRef<any>(null);

  const [roomData, setRoomData] = useState<RoomData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [callActive, setCallActive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(false);

  useEffect(() => {
    fetchToken();
  }, [roomId]);

  // Timer during call
  useEffect(() => {
    if (!callActive) return;
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [callActive]);

  async function fetchToken() {
    try {
      const res = await fetch(`/api/room/${roomId}/token`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Cannot access this room");
        return;
      }
      setRoomData(data);
    } catch {
      setError("Failed to connect. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function joinCall() {
    if (!roomData) return;

    // Load Daily.co script dynamically
    if (!window.DailyIframe) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/@daily-co/daily-js";
      document.head.appendChild(script);
      await new Promise((resolve) => { script.onload = resolve; });
    }

    // Create call frame inside our container
    const callFrame = window.DailyIframe.createFrame(
      document.getElementById("call-container")!,
      {
        showLeaveButton: false,
        showFullscreenButton: true,
        iframeStyle: {
          width: "100%",
          height: "100%",
          border: "none",
          borderRadius: "16px",
        },
      }
    );

    callFrameRef.current = callFrame;

    callFrame.on("joined-meeting", () => setCallActive(true));
    callFrame.on("left-meeting", () => endCall());
    callFrame.on("error", (e: any) => setError(e.errorMsg));

    await callFrame.join({
      url: roomData.roomUrl,
      token: roomData.token,
      userName: roomData.participantName,
    });
  }

  async function endCall() {
    if (callFrameRef.current) {
      await callFrameRef.current.leave();
      callFrameRef.current.destroy();
      callFrameRef.current = null;
    }
    setCallActive(false);
    router.push("/patient/appointments");
  }

  async function toggleMic() {
    if (!callFrameRef.current) return;
    if (micOn) {
      await callFrameRef.current.setLocalAudio(false);
    } else {
      await callFrameRef.current.setLocalAudio(true);
    }
    setMicOn(!micOn);
  }

  async function toggleCam() {
    if (!callFrameRef.current) return;
    if (camOn) {
      await callFrameRef.current.setLocalVideo(false);
    } else {
      await callFrameRef.current.setLocalVideo(true);
    }
    setCamOn(!camOn);
  }

  async function saveNotes() {
    await fetch(`/api/appointments/${roomData?.appointment.id}/notes`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setNotesSaved(true);
    setTimeout(() => setNotesSaved(false), 2000);
  }

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={40} className="animate-spin text-emerald-400 mx-auto mb-4" />
        <p className="text-slate-300">Connecting to consultation room...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-white font-bold text-xl mb-2">Cannot join room</h2>
        <p className="text-slate-400 mb-6">{error}</p>
        <button
          onClick={() => router.back()}
          className="bg-slate-700 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-600 transition"
        >
          Go back
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">

      {/* Top bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black text-white">Doctor<span className="text-emerald-400">8</span></span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-300 text-sm">Teleconsultation</span>
        </div>
        <div className="flex items-center gap-4">
          {callActive && (
            <div className="flex items-center gap-2 bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-full text-sm font-semibold">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              {formatTime(elapsed)}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield size={12} />
            HIPAA Encrypted
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">

        {/* Video area */}
        <div className="flex-1 p-4 lg:p-6">
          {!callActive ? (
            /* Waiting room */
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-6">
                  <Video size={40} className="text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {roomData?.isOwner ? "Start the consultation" : "Ready to join"}
                </h2>
                <p className="text-slate-400 mb-2">
                  {new Date(roomData?.appointment.scheduledAt || "").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric",
                  })}
                </p>
                <p className="text-slate-400 mb-8">
                  {new Date(roomData?.appointment.scheduledAt || "").toLocaleTimeString("en-US", {
                    hour: "2-digit", minute: "2-digit",
                  })} · {roomData?.appointment.durationMins} min
                </p>
                <div className="flex gap-3 justify-center flex-wrap mb-8">
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${micOn ? "bg-slate-800 text-slate-300" : "bg-red-500/20 text-red-400"}`}>
                    {micOn ? <Mic size={16} /> : <MicOff size={16} />}
                    {micOn ? "Microphone on" : "Microphone off"}
                  </div>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${camOn ? "bg-slate-800 text-slate-300" : "bg-red-500/20 text-red-400"}`}>
                    {camOn ? <Video size={16} /> : <VideoOff size={16} />}
                    {camOn ? "Camera on" : "Camera off"}
                  </div>
                </div>
                <button
                  onClick={joinCall}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-10 py-4 rounded-2xl text-lg transition flex items-center gap-3 mx-auto"
                >
                  <Video size={22} />
                  {roomData?.isOwner ? "Start consultation" : "Join consultation"}
                </button>
                <p className="text-xs text-slate-600 mt-4 flex items-center gap-1 justify-center">
                  <Shield size={11} /> End-to-end encrypted · HIPAA compliant
                </p>
              </div>
            </div>
          ) : (
            /* Active call */
            <div className="h-full flex flex-col gap-4">
              <div id="call-container" className="flex-1 rounded-2xl overflow-hidden bg-slate-900 min-h-[400px]" />
              {/* Call controls */}
              <div className="flex items-center justify-center gap-3">
                <ControlBtn
                  active={micOn}
                  onClick={toggleMic}
                  activeIcon={<Mic size={20} />}
                  inactiveIcon={<MicOff size={20} />}
                  label={micOn ? "Mute" : "Unmute"}
                />
                <ControlBtn
                  active={camOn}
                  onClick={toggleCam}
                  activeIcon={<Video size={20} />}
                  inactiveIcon={<VideoOff size={20} />}
                  label={camOn ? "Stop video" : "Start video"}
                />
                {roomData?.isOwner && (
                  <button
                    onClick={() => setShowNotes(!showNotes)}
                    className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl transition ${showNotes ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
                  >
                    <FileText size={20} />
                    <span className="text-xs">Notes</span>
                  </button>
                )}
                <button
                  onClick={endCall}
                  className="flex flex-col items-center gap-1 px-6 py-3 rounded-2xl bg-red-500 hover:bg-red-400 text-white transition"
                >
                  <PhoneOff size={20} />
                  <span className="text-xs">End call</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notes panel — professional only */}
        {showNotes && roomData?.isOwner && (
          <div className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <p className="text-white font-semibold text-sm flex items-center gap-2">
                <FileText size={16} className="text-emerald-400" /> Consultation notes
              </p>
              <button onClick={() => setShowNotes(false)} className="text-slate-500 hover:text-white text-xs">Close</button>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type your consultation notes here... (encrypted, only you can see this)"
                className="w-full h-full bg-slate-800 text-slate-200 text-sm rounded-xl p-4 resize-none outline-none border border-slate-700 focus:border-emerald-500/50 placeholder:text-slate-600"
              />
            </div>
            <div className="p-4 border-t border-slate-800">
              <button
                onClick={saveNotes}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl text-sm transition"
              >
                {notesSaved ? "✓ Saved" : "Save notes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ControlBtn({ active, onClick, activeIcon, inactiveIcon, label }: {
  active: boolean; onClick: () => void;
  activeIcon: React.ReactNode; inactiveIcon: React.ReactNode; label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 px-5 py-3 rounded-2xl transition ${
        active ? "bg-slate-800 text-slate-300 hover:bg-slate-700" : "bg-red-500/20 text-red-400 hover:bg-red-500/30"
      }`}
    >
      {active ? activeIcon : inactiveIcon}
      <span className="text-xs">{label}</span>
    </button>
  );
}

// Extend Window for Daily.co
declare global {
  interface Window { DailyIframe: any; }
}
