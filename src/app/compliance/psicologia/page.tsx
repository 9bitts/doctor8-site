import Link from "next/link";
import { Shield, FileText, Lock, Scale } from "lucide-react";

export const metadata = {
  title: "Conformidade CFP + LGPD — Doctor8 Psicologia",
  description: "Prontuário eletrônico, TDICs, sigilo e proteção de dados para psicólogos no Brasil.",
};

export default function PublicPsychologyCompliancePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-100 bg-violet-50/50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-violet-700 mb-3">
            <Shield size={22} />
            <span className="font-semibold">Doctor8 — Psicologia</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">
            Conformidade CFP, TDICs e LGPD
          </h1>
          <p className="text-slate-600 mt-3 leading-relaxed">
            O Doctor8 foi projetado para apoiar psicólogos no exercício mediado por tecnologias digitais,
            com prontuário criptografado, trilha de auditoria, assinatura digital ICP-Brasil e ferramentas
            alinhadas à Resolução CFP nº 09/2024.
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10 space-y-10">
        <section className="grid sm:grid-cols-2 gap-4">
          {[
            { icon: FileText, title: "Prontuário eletrônico", body: "Registro estruturado (DAP, BIRP, SOAP), documentos CFP, escalas PHQ-9/GAD-7/BAI/BDI-II/DASS-21 e exportação PDF." },
            { icon: Lock, title: "Sigilo e LGPD", body: "Criptografia AES-256-GCM, logs de acesso, consentimento e retenção conforme Resoluções CFP 01/2009 e 06/2019." },
            { icon: Scale, title: "Receita Saúde", body: "Assistente fiscal com checklist, recibo auxiliar em PDF e orientação para emissão oficial no app da Receita Federal." },
            { icon: Shield, title: "Telepsicologia", body: "Videoconferência segura, TCLE específico, registro de emergências e encaminhamento à rede de proteção." },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-200 p-5">
              <item.icon className="text-violet-600 mb-2" size={22} />
              <h2 className="font-semibold text-slate-900">{item.title}</h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="prose prose-slate max-w-none text-sm">
          <h2>Resolução CFP nº 09/2024 (TDICs)</h2>
          <p>
            A plataforma oferece recursos para contrato de prestação de serviços, termo de consentimento TDIC,
            registro de urgência/emergência e encaminhamento à rede — obrigações documentadas no prontuário.
          </p>
          <h2>Guarda documental</h2>
          <p>
            Prazo mínimo de guarda de 5 anos conforme CFP. Exportação portável do prontuário em PDF para
            continuidade do cuidado ou migração entre sistemas.
          </p>
        </section>

        <p className="text-sm text-slate-500">
          <Link href="/privacy" className="text-violet-600 underline">Política de privacidade</Link>
          {" · "}
          <Link href="/terms" className="text-violet-600 underline">Termos de uso</Link>
          {" · "}
          <Link href="/register/professional/signup?portal=psychologist" className="text-violet-600 underline">
            Cadastro psicólogo
          </Link>
        </p>
      </main>
    </div>
  );
}
