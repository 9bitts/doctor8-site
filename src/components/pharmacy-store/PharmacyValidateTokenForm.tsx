"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, QrCode } from "lucide-react";

type Props = {
  onToken: (token: string) => void;
};

export default function PharmacyQrScanner({ onToken }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let cancelled = false;

    async function start() {
      setError(null);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled || !videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        const Detector = (window as { BarcodeDetector?: new (opts: { formats: string[] }) => {
          detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>;
        } }).BarcodeDetector;
        if (!Detector) {
          setError("Seu navegador não suporta leitura de QR. Digite o código manualmente.");
          return;
        }
        const detector = new Detector({ formats: ["qr_code"] });

        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const raw = codes[0]?.rawValue;
            if (raw) {
              const match = raw.match(/\/farmacias\/validar\/([a-f0-9]+)/i);
              const token = match?.[1] ?? raw.trim();
              onToken(token);
              router.push(`/farmacias/validar/${token}`);
              return;
            }
          } catch {
            // keep scanning
          }
          raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      } catch {
        setError("Não foi possível acessar a câmera.");
      }
    }

    start();
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active, onToken, router]);

  if (!active) {
    return (
      <button
        type="button"
        onClick={() => setActive(true)}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50"
      >
        <Camera size={16} />
        Escanear QR da receita
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative rounded-xl overflow-hidden bg-black aspect-video max-h-48">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 text-center text-xs text-white">
            {error}
          </div>
        )}
        {!error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="animate-spin text-white/80" size={28} />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setActive(false)}
        className="text-xs text-slate-500 hover:text-slate-700"
      >
        Cancelar scanner
      </button>
    </div>
  );
}

export function PharmacyValidateTokenForm() {
  const [token, setToken] = useState("");
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 max-w-md">
      <div className="flex items-center gap-2 text-emerald-700">
        <QrCode size={20} />
        <h2 className="font-bold text-slate-900">Validar receita</h2>
      </div>
      <p className="text-sm text-slate-500">
        Escaneie o QR da receita ou cole o código de validação.
      </p>
      <PharmacyQrScanner onToken={setToken} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const t = token.trim();
          if (t) router.push(`/farmacias/validar/${t}`);
        }}
        className="flex gap-2"
      >
        <input
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Código da receita"
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={!token.trim()}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
        >
          Validar
        </button>
      </form>
    </div>
  );
}
