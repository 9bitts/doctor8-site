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
  Zap,
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

const CANNABIS_BULLETS = [
  "Catálogo por composição CBD/THC — mais de 50 apresentações genéricas",
  "Receituário conforme concentração, alinhado à RDC Anvisa nº 1.015/2026",
  "TCLE integrado e fluxo exclusivo para médicos e cirurgiões-dentistas",
  "Prescrição digital assinada com ICP-Brasil, na mesma plataforma integrativa",
];

const PRACTICES = [
  { label: "Fitoterápicos", count: "92+" },
  { label: "Florais", count: "145+" },
  { label: "Aromaterapia", count: "25+" },
  { label: "Homeopatia", count: "40+" },
  { label: "Apiterapia", count: "5" },
  { label: "Cannabis medicinal", count: "50+", highlight: true },
];

export default function MedicinaIntegrativaLandingPage() {
  const loginHref = doctorIntegrativeLoginHref();
  const registerHref = doctorIntegrativeRegisterHref();

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "linear-gradient(180deg, #ffffff 0%, #f9fcfb 22%, #f2f8f5 55%, #eaf3ee 100%)",
      }}
    >
      {/* Hero — tons naturais com texto escuro para legibilidade */}
      <header className="relative overflow-hidden border-b border-emerald-200/60">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-emerald-200/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-emerald-200/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-1/4 h-32 w-32 rounded-full bg-stone-300/20 blur-2xl"
        />

        <div className="relative max-w-5xl mx-auto px-4 py-16 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-900 mb-4">
            <Leaf size={14} className="text-emerald-700" />
            Doctor8 Integrativa
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight max-w-3xl text-stone-900">
            Medicina integrativa com prescrição digital, catálogo e{" "}
            <span className="text-emerald-800">cannabis medicinal</span>
          </h1>

          <p className="mt-5 text-lg max-w-2xl leading-relaxed text-stone-700">
            Tudo o que o médico integrativo precisa no Doctor8: monografias oficiais, protocolos de início
            rápido, receita assinada e entrega ao paciente — em um único painel médico.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-100 px-6 py-3 font-semibold text-slate-900 shadow-sm transition hover:bg-emerald-200"
            >
              Entrar como médico <ArrowRight size={18} />
            </Link>
            <Link
              href={registerHref}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:bg-emerald-50"
            >
              Criar conta médica
            </Link>
          </div>

          <p className="mt-5 text-sm text-stone-600 max-w-xl">
            Login exclusivo para médicos e cirurgiões-dentistas (CRM/CRO). Após entrar, você acessa a área{" "}
            <strong className="font-semibold text-stone-800">Integrativa</strong> no painel.
          </p>
        </div>
      </header>

      {/* Destaque exclusivo — Cannabis Medicinal */}
      <section className="relative overflow-hidden bg-d8-cannabis text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(134,239,172,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(163,230,53,0.25) 0%, transparent 40%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/20 border border-emerald-300/30 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-200 mb-4">
                <Zap size={14} />
                Destaque exclusivo
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/20 border border-emerald-300/30">
                  <Sprout size={26} className="text-emerald-300" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white">Cannabis Medicinal</h2>
              </div>
              <p className="text-base sm:text-lg leading-relaxed text-emerald-100/95">
                Módulo completo para prescrição de cannabis medicinal no Doctor8 — catálogo por composição,
                regras regulatórias e receituário digital, exclusivo para médicos e cirurgiões-dentistas.
              </p>
              <ul className="mt-6 space-y-3">
                {CANNABIS_BULLETS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm sm:text-base text-emerald-50">
                    <CheckCircle2 size={18} className="text-emerald-300 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={loginHref}
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 font-semibold text-slate-900 shadow-lg shadow-black/20 transition hover:bg-emerald-200"
              >
                Acessar módulo de cannabis <ArrowRight size={18} />
              </Link>
            </div>

            <div className="rounded-2xl border border-emerald-300/20 bg-white/10 backdrop-blur-sm p-6 sm:p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-200 mb-4">
                O que você encontra no catálogo
              </p>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Óleos CBD isolado", count: "12+" },
                  { label: "Broad & full spectrum", count: "18+" },
                  { label: "Balanceados CBD/THC", count: "15+" },
                  { label: "THC dominante", count: "5+" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-center"
                  >
                    <p className="text-2xl font-bold text-emerald-200">{item.count}</p>
                    <p className="text-xs text-emerald-100 mt-1 leading-snug">{item.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs text-emerald-200/80 leading-relaxed">
                Conforme RDC Anvisa nº 1.015/2026. Prescrição restrita a profissionais habilitados com CRM ou CRO
                ativo.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(209,250,229,0.35) 0%, transparent 70%)",
          }}
        />

      <main className="relative max-w-5xl mx-auto px-4 py-14 space-y-8">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800 mb-2">
            Recursos operacionais
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-3">O que está disponível hoje</h2>
          <p className="text-stone-700 mb-8 max-w-2xl leading-relaxed">
            Recursos já operacionais no Doctor8 para o médico que pratica medicina integrativa e medicina
            natural regulada.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 mb-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm hover:border-emerald-300 hover:shadow-md transition"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
                  <f.icon className="text-emerald-800" size={20} />
                </div>
                <h3 className="font-semibold text-stone-900">{f.title}</h3>
                <p className="text-sm text-stone-700 mt-2 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="pt-10 mt-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 mb-2">6 práticas no catálogo</h2>
          <p className="text-stone-700 mb-6">Cobertura completa das principais modalidades da medicina natural.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PRACTICES.map((p) =>
              p.highlight ? (
                <div
                  key={p.label}
                  className="rounded-xl border-2 border-emerald-600 bg-d8-cannabis px-4 py-4 text-center shadow-md col-span-2 sm:col-span-1"
                >
                  <p className="text-2xl font-bold text-emerald-200">{p.count}</p>
                  <p className="text-sm font-semibold text-emerald-50 mt-1">{p.label}</p>
                  <span className="mt-2 inline-block rounded-full bg-emerald-400/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
                    Exclusivo
                  </span>
                </div>
              ) : (
                <div
                  key={p.label}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-center shadow-sm"
                >
                  <p className="text-2xl font-bold text-emerald-800">{p.count}</p>
                  <p className="text-sm text-stone-700 mt-1">{p.label}</p>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-stone-50 p-8 shadow-sm">
          <h2 className="text-xl font-bold text-stone-900">Como acessar</h2>
          <ol className="mt-4 space-y-3 text-sm text-stone-800">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              Faça login com sua conta médica (CRM) no Doctor8
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              No painel, abra o menu <strong className="font-semibold">Integrativa</strong> na área clínica
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              Busque monografias, use protocolos sugeridos ou crie prescrição integrativa
            </li>
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={loginHref}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 bg-emerald-100 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-emerald-200 transition"
            >
              Ir para o login médico <ArrowRight size={16} />
            </Link>
            <Link
              href={PROFESSIONAL_INTEGRATIVE_HUB}
              className="inline-flex items-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 hover:bg-emerald-50 transition"
            >
              Ver área Integrativa (requer login)
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-emerald-200 py-8 text-center text-sm text-slate-600">
        <Link href="/privacy" className="font-medium text-emerald-800 underline hover:text-emerald-900">
          Privacidade
        </Link>
        {" · "}
        <Link href="/terms" className="font-medium text-emerald-800 underline hover:text-emerald-900">
          Termos
        </Link>
        {" · "}
        <Link href="/especialistas" className="font-medium text-emerald-800 underline hover:text-emerald-900">
          Especialistas
        </Link>
      </footer>
      </div>
    </div>
  );
}
