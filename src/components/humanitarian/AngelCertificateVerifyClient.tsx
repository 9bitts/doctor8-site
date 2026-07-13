"use client";

import { useEffect, useState } from "react";
import { Award, CheckCircle2, Loader2, XCircle } from "lucide-react";

type CertData = {
  volunteerName: string;
  campaignName: string;
  tracks: string[];
  totalHours: number;
  issuedAt: string;
  verifyCode: string;
};

export default function AngelCertificateVerifyClient({ code }: { code: string }) {
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState(false);
  const [cert, setCert] = useState<CertData | null>(null);

  useEffect(() => {
    fetch(`/api/public/angel-certificates/verify/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        setValid(data.valid === true);
        if (data.certificate) setCert(data.certificate);
      })
      .catch(() => setValid(false))
      .finally(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-sm text-center">
        {valid && cert ? (
          <>
            <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Certificado válido</h1>
            <p className="text-sm text-slate-500 mb-6">Voluntariado humanitário Doctor8</p>
            <div className="text-left space-y-3 text-sm bg-slate-50 rounded-xl p-4">
              <p><strong>Nome:</strong> {cert.volunteerName}</p>
              <p><strong>Campanha:</strong> {cert.campaignName}</p>
              <p><strong>Trilhas:</strong> {cert.tracks.join(", ")}</p>
              <p><strong>Horas:</strong> {cert.totalHours}</p>
              <p><strong>Emitido:</strong> {new Date(cert.issuedAt).toLocaleDateString()}</p>
              <p className="font-mono text-xs text-slate-500">{cert.verifyCode}</p>
            </div>
          </>
        ) : (
          <>
            <XCircle className="w-14 h-14 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-slate-900">Código não encontrado</h1>
            <p className="text-sm text-slate-500 mt-2">Verifique o código informado.</p>
          </>
        )}
        <Award className="w-6 h-6 text-rose-400 mx-auto mt-8" />
      </div>
    </div>
  );
}
