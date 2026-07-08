"use client";

import { useEffect, useRef, useState } from "react";
import { Headphones, Loader2 } from "lucide-react";

type Props = {
  contentId: string;
  audioUrl?: string | null;
  transcript?: string | null;
  durationSecs?: number | null;
  completed?: boolean;
  onProgress?: (secs: number, completed: boolean) => void;
};

export function ContentAudioPlayer({
  contentId,
  audioUrl,
  transcript,
  durationSecs,
  completed,
  onProgress,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const src = audioUrl || `/api/workforce/content/audio/${contentId}`;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      const secs = Math.floor(audio.currentTime);
      setProgress(secs);
      const total = durationSecs ?? audio.duration ?? 0;
      const done = completed || (total > 0 && audio.currentTime >= total * 0.9);
      onProgress?.(secs, done);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", () => {
      setPlaying(false);
      onProgress?.(durationSecs ?? Math.floor(audio.duration), true);
    });
    return () => {
      audio.removeEventListener("timeupdate", onTime);
    };
  }, [contentId, completed, durationSecs, onProgress]);

  return (
    <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Headphones size={16} className="text-violet-600" />
        <button
          type="button"
          onClick={() => {
            const audio = audioRef.current;
            if (!audio) return;
            if (playing) {
              audio.pause();
              setPlaying(false);
            } else {
              audio.play().then(() => setPlaying(true)).catch(() => {});
            }
          }}
          className="text-xs font-medium text-violet-700 hover:underline"
        >
          {playing ? "Pausar áudio" : "Ouvir trilha"}
        </button>
        {durationSecs && (
          <span className="text-xs text-slate-400 ml-auto">
            {Math.floor(progress / 60)}:{String(progress % 60).padStart(2, "0")} / {Math.floor(durationSecs / 60)}:{String(durationSecs % 60).padStart(2, "0")}
          </span>
        )}
      </div>
      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      {transcript && (
        <p className="text-xs text-slate-600 leading-relaxed border-t border-violet-100 pt-2">{transcript}</p>
      )}
    </div>
  );
}

export function ContentAudioPlayerSkeleton() {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <Loader2 size={14} className="animate-spin" /> Carregando áudio…
    </div>
  );
}
