import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileSignature,
  FlaskConical,
  Leaf,
  Shield,
  Sprout,
  Stethoscope,
} from "lucide-react";
import {
  doctorIntegrativeLoginHref,
  doctorIntegrativeRegisterHref,
  PROFESSIONAL_INTEGRATIVE_HUB,
} from "@/lib/integrative-medicine/professional-routes";

export const metadata = {
  title: "Doctor8 Integrativa — Prescrição, catálogo e cannabis medicinal para médicos",
  description:
    "Área integrativa para médicos no Doctor8: fitoterapia MFFB/FFFB, florais, homeopatia, aromaterapia, apiterapia, cannabis medicinal (RDC 1.015/2026), chás Seu Enésio e prescrição digital com assinatura ICP-Brasil.",
};

const FEATURES = [
  {
    icon: Leaf,
    title: "Catálogo monográfico",
    desc: "Mais de 300 itens — fitoterápicos MFFB/FFFB, florais Bach, homeopatia, aromaterapia e apiterapia com status regulatório Anvisa.",
  },
  {
    icon: Stethoscope,
    title: "Prescrição integrativa",
    desc: "Receita digital com fitoterápicos, florais, homeopatia, aromaterapia e apiterapia na mesma plataforma dos medicamentos convencionais.",
  },
  {
    icon: Sprout,
    title: "Cannabis medicinal",
    desc: "Catálogo por composição CBD/THC, regras RDC 1.015/2026 e receituário conforme concentração — exclusivo para médicos e cirurgiões-dentistas.",
  },
  {
    icon: FlaskConical,
    title: "Chás Seu Enésio",
    desc: "17 protocolos de chás medicinais com plantas e orientações — módulo complementar ao catálogo oficial.",
  },
  {
    icon: FileSignature,
    title: "Assinatura digital",
    desc: "PDF com assinatura ICP-Brasil (Lacuna) e entrega por WhatsApp ou e-mail ao paciente.",
  },
  {
    icon: Shield,
    title: "Lógica regulatória",
    desc: "Itens registrados → prescrever; não regulados → orientação clínica documentada, conforme status Anvisa.",
  },
];

const PRACTICES = [
  { label: "Fitoterápicos", count: "92+" },
  { label: "Florais", count: "145+" },
  { label: "Aromaterapia", count: "25+" },
  { label: "Homeopatia", count: "40+" },
  { label: "Apiterapia", count: "5" },
  { label: "Cannabis medicinal", count: "50+" },
];

export default function MedicinaIntegrativaLandingPage() {
  const loginHref = doctorIntegrativeLoginHref();
  const registerHref = doctorIntegrativeRegisterHref();

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-emerald-700 text-white">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <p className="text-emerald-200 text-sm font-semibold uppercase tracking-wide mb-3">
            Doctor8 Integrativa
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight max-w-2xl">
            Medicina integrativa com prescrição digital, catálogo e cannabis medicinal
          </h1>
          <p className="mt-4 text-white/90 text-lg max-w-xl leading-relaxed">
            Tudo o que o médico integrativo precisa no Doctor8: monografias oficiais, protocolos de início
            rápido, receita assinada e entrega ao paciente — em um único painel médico.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 bg-white text-emerald-800 font-semibold px-6 py-3 rounded-xl hover:bg-emerald-50 transition"
            >
              Entrar como médico <ArrowRight size={18} />
            </Link>
            <Link
              href={registerHref}
              className="inline-flex items-center gap-2 border border-white/40 text-white font-medium px-6 py-3 rounded-xl hover:bg-white/10 transition"
            >
              Criar conta médica
            </Link>
          </div>
          <p className="mt-4 text-sm text-emerald-100/90">
            Login exclusivo para médicos e cirurgiões-dentistas (CRM/CRO). Após entrar, você acessa a área{" "}
            <strong>Integrativa</strong> no painel.
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-14 space-y-16">
        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">O que está disponível hoje</h2>
          <p className="text-slate-600 mb-8">
            Recursos já operacionais no Doctor8 para o médico que pratica medicina integrativa e medicina
            natural regulada.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 p-5 hover:border-emerald-200 transition"
              >
                <f.icon className="text-emerald-600 mb-3" size={22} />
                <h3 className="font-semibold text-slate-900">{f.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-slate-900 mb-6">6 práticas no catálogo</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRACTICES.map((p) => (
              <div
                key={p.label}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center"
              >
                <p className="text-2xl font-bold text-emerald-700">{p.count}</p>
                <p className="text-sm text-slate-600 mt-1">{p.label}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-emerald-50 border border-emerald-100 p-8">
          <h2 className="text-xl font-bold text-slate-900">Como acessar</h2>
          <ol className="mt-4 space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              Faça login com sua conta médica (CRM) no Doctor8
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              No painel, abra o menu <strong>Integrativa</strong> na área clínica
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              Busque monografias, use protocolos sugeridos ou crie prescrição integrativa
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              Ir para o login médico <ArrowRight size={16} />
            </Link>
            <Link
              href={PROFESSIONAL_INTEGRATIVE_HUB}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-300 bg-white px-5 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 transition"
            >
              Ver área Integrativa (requer login)
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-500">
        <Link href="/privacy" className="text-emerald-700 underline">
          Privacidade
        </Link>
        {" · "}
        <Link href="/terms" className="text-emerald-700 underline">
          Termos
        </Link>
        {" · "}
        <Link href="/especialistas" className="text-emerald-700 underline">
          Especialistas
        </Link>
      </footer>
    </div>
  );
}
