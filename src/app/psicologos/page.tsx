import Link from "next/link";
import {
  Brain, Calendar, Video, MessageSquare, Sparkles, Shield, FileText,
  BarChart3, ArrowRight, CheckCircle2,
} from "lucide-react";

export const metadata = {
  title: "Doctor8 para Psicólogos — Telepsicologia, prontuário CFP e plantão online",
  description:
    "Plataforma completa para psicólogos: teleconsulta, escalas PHQ-9/GAD-7/BAI/BDI-II/DASS-21, anamnese digital, IA clínica, Google Agenda, Receita Saúde e plantão JIT.",
};

const FEATURES = [
  { icon: Video, title: "Telepsicologia segura", desc: "Videoconferência no navegador, TCLE CFP e sala privada por sessão." },
  { icon: FileText, title: "Prontuário CFP", desc: "Notas DAP, BIRP, SOAP, documentos TDIC e exportação PDF." },
  { icon: BarChart3, title: "Escalas validadas", desc: "PHQ-9, GAD-7, BAI, BDI-II e DASS-21 com alertas de risco clínico." },
  { icon: Sparkles, title: "IA clínica", desc: "Rascunhos de notas e chat com prontuário (RAG) para profissionais Pro." },
  { icon: Calendar, title: "Agenda + Google", desc: "Agendamento online, lembretes WhatsApp 24h e sync com Google Agenda." },
  { icon: MessageSquare, title: "Anamnese digital", desc: "Link compartilhável para o paciente preencher antes da 1ª sessão." },
  { icon: Shield, title: "Conformidade", desc: "LGPD, trilha de auditoria, assinatura ICP-Brasil e página pública de compliance." },
  { icon: Brain, title: "Plantão JIT", desc: "Única plataforma com fila sob demanda — pacientes encontram você online." },
];

const PLANS = [
  { name: "Grátis", price: "R$ 0", items: ["Até 3 pacientes", "Escalas e anamnese", "Rascunhos IA de notas"] },
  { name: "Pro", price: "R$ 79/mês", items: ["Pacientes ilimitados", "Chat com prontuário", "Google Agenda", "Plantão JIT"], highlight: true },
  { name: "Clínica", price: "R$ 149/mês", items: ["Vários psicólogos", "Todos os recursos Pro", "Repasse (em breve)"] },
];

export default function PsicologosLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="bg-violet-600 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <p className="text-violet-200 text-sm font-semibold uppercase tracking-wide mb-3">Doctor8 Psicologia</p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight max-w-2xl">
            A plataforma de saúde mental integrada para o seu consultório
          </h1>
          <p className="mt-4 text-white/90 text-lg max-w-xl leading-relaxed">
            Telepsicologia com plantão online, prontuário alinhado ao CFP, escalas clínicas e ferramentas fiscais para psicólogos no Brasil.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register/professional/signup?portal=psychologist"
              className="inline-flex items-center gap-2 bg-white text-violet-700 font-semibold px-6 py-3 rounded-xl hover:bg-violet-50 transition"
            >
              Começar grátis <ArrowRight size={18} />
            </Link>
            <Link
              href="/compliance/psicologia"
              className="inline-flex items-center gap-2 border border-white/40 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition"
            >
              Ver conformidade CFP
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-14 space-y-16">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Tudo que o mercado exige — e o que só o Doctor8 tem</h2>
          <p className="text-slate-600 mb-8">Paridade com PsicoManager e Sinthoma, com diferenciais únicos: plantão JIT, ecossistema médico e impacto humanitário.</p>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border border-slate-200 p-5 hover:border-violet-200 transition">
                <f.icon className="text-violet-600 mb-3" size={22} />
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">Planos transparentes</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-6 ${
                  plan.highlight ? "border-violet-300 bg-violet-50/50 ring-2 ring-violet-200" : "border-slate-200"
                }`}
              >
                <p className="font-bold text-slate-900">{plan.name}</p>
                <p className="text-2xl font-bold text-slate-900 mt-2">{plan.price}</p>
                <ul className="mt-4 space-y-2">
                  {plan.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                      <CheckCircle2 size={14} className="text-violet-500 shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p className="text-sm text-slate-500 mt-4">
            O plano Pro corresponde ao Doctor Connection na plataforma.{" "}
            <Link href="/register/professional/psicologo" className="text-violet-600 underline">
              Saiba mais
            </Link>
          </p>
        </section>

        <section className="rounded-2xl bg-violet-50 border border-violet-100 p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Médicos do ecossistema podem encaminhar pacientes direto para você</h2>
          <p className="text-slate-600 mt-2 max-w-lg mx-auto text-sm">
            Encaminhamento integrado médico → psicólogo com link de agendamento e registro no prontuário compartilhado.
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        <Link href="/privacy" className="text-violet-600 underline">Privacidade</Link>
        {" · "}
        <Link href="/terms" className="text-violet-600 underline">Termos</Link>
        {" · "}
        <Link href="/login" className="text-violet-600 underline">Entrar</Link>
      </footer>
    </div>
  );
}
