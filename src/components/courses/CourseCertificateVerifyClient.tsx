"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sora } from "next/font/google";
import { Award, CheckCircle2, Loader2, Shield, XCircle } from "lucide-react";
import { BrandLogoLink } from "@/components/brand/BrandLogo";

const sora = Sora({ subsets: ["latin"], weight: ["600", "700", "800"] });

type CertData = {
  verifyCode: string;
  studentName: string;
  courseTitle: string;
  instructorName: string;
  workloadHours: number | null;
  issuedAt: string;
  completedAt: string | null;
  professionLabel: string;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function CourseCertificateVerifyClient({ code }: { code: string }) {
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState<CertData | null>(null);

  useEffect(() => {
    fetch(`/api/courses/certificates/verify/${encodeURIComponent(code)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.valid) setCert(data.certificate);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [code]);

  if (loading) {
    return (
      <div className={`${sora.className} flex min-h-screen items-center justify-center bg-d8-off`}>
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    );
  }

  return (
    <div className={`${sora.className} min-h-screen bg-d8-off text-d8-text`}>
      <header className="border-b border-white/10 bg-d8-dark px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <BrandLogoLink href="/" variant="on-dark" size="md" />
          <Link href="/cursos" className="text-sm font-medium text-white/70 hover:text-white">
            Cursos
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        {cert ? (
          <div className="overflow-hidden rounded-2xl border border-d8-border bg-white shadow-xl">
            <div className="bg-d8-hero px-6 py-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/15">
                <Award size={32} className="text-accent-300" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent-300">
                Certificado verificado
              </p>
              <h1 className="mt-2 text-2xl font-extrabold">Doctor8 Educação</h1>
            </div>

            <div className="space-y-5 p-6 sm:p-8">
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                <CheckCircle2 size={18} />
                Este certificado é autêntico e foi emitido pela Doctor8.
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-d8-muted">Aluno</p>
                  <p className="text-lg font-semibold text-d8-dark">{cert.studentName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-d8-muted">Curso</p>
                  <p className="text-lg font-semibold text-d8-dark">{cert.courseTitle}</p>
                  <p className="text-sm text-d8-muted">{cert.professionLabel}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-d8-muted">Instrutor</p>
                  <p className="font-medium text-d8-dark">{cert.instructorName}</p>
                </div>
                {cert.workloadHours != null && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-d8-muted">
                      Carga horária
                    </p>
                    <p className="font-medium text-d8-dark">{cert.workloadHours} horas</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-d8-muted">
                    Emitido em
                  </p>
                  <p className="font-medium text-d8-dark">{formatDate(cert.issuedAt)}</p>
                </div>
              </div>

              <div className="rounded-xl border border-d8-border bg-d8-off/50 px-4 py-3 text-center">
                <p className="text-xs text-d8-muted">Código de verificação</p>
                <p className="font-mono text-lg font-bold tracking-wider text-d8-dark">
                  {cert.verifyCode}
                </p>
              </div>

              <p className="flex items-center justify-center gap-1.5 text-xs text-d8-muted">
                <Shield size={12} />
                Verificação digital Doctor8 · Sem assinatura ICP-Brasil nesta versão
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-d8-border bg-white p-10 text-center shadow-sm">
            <XCircle className="mx-auto text-red-400" size={48} />
            <h1 className="mt-4 text-xl font-bold text-d8-dark">Certificado não encontrado</h1>
            <p className="mt-2 text-d8-muted">
              O código <span className="font-mono font-semibold">{code}</span> não corresponde a
              nenhum certificado válido.
            </p>
            <Link
              href="/cursos"
              className="mt-6 inline-block font-semibold text-brand-600 hover:underline"
            >
              Ver cursos Doctor8
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
