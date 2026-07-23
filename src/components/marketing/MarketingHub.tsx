import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import MarketingLeadForm from "@/components/marketing/MarketingLeadForm";
import {
  MARKETING_ACCESS_ROWS,
  MARKETING_AUDIENCES,
  MARKETING_MODEL_POINTS,
  MARKETING_PRODUCTS,
  MARKETING_SPECIALTIES,
  MARKETING_TRUST,
  marketingCommercialWhatsAppHref,
  marketingWhatsAppHref,
} from "@/lib/marketing-hub-content";

const SCORE_LABEL = {
  alto: "Prioridade comercial",
  medio: "Self-serve + nurture",
  self: "Produto",
} as const;

export default function MarketingHub() {
  const commercialWhatsApp = marketingCommercialWhatsAppHref();

  return (
    <main>
      {/* Hero — one composition, brand first */}
      <section className="relative overflow-hidden border-b border-white/10 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-900/40 via-slate-950 to-slate-950" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-70" />

        <div className="relative max-w-6xl mx-auto px-4 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <BrandLogo variant="on-dark" size="lg" />
          <h1 className="mt-8 max-w-3xl text-3xl sm:text-5xl font-bold tracking-tight text-white leading-[1.1]">
            Ecossistema de saúde digital —{" "}
            <span className="text-accent-400">mapa completo</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
            Conectamos pacientes, profissionais, clínicas, empresas e parceiros.
            Escolha seu perfil e acesse landing, login e cadastro certos.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#contato"
              className="inline-flex items-center gap-2 rounded-xl bg-accent-500 px-5 py-3 text-sm font-semibold text-white hover:bg-accent-600 transition shadow-lg shadow-accent-500/25"
            >
              Falar com comercial <ArrowRight size={16} />
            </a>
            <a
              href="#audiencias"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Quem é você?
            </a>
            <Link
              href="/marketing/estrategias"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition"
            >
              Estratégias por público
            </Link>
            <Link
              href="/pacientes"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-slate-300 hover:text-white transition"
            >
              Sou paciente
            </Link>
          </div>
        </div>
      </section>

      {/* Audience selector */}
      <section id="audiencias" className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Comece por aqui
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
            Quem é você?
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Um clique leva à landing do seu perfil. Em cada card: conhecer, entrar ou cadastrar.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MARKETING_AUDIENCES.map((audience) => (
              <article
                key={audience.id}
                id={audience.anchor}
                className="scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-50/80 p-5 sm:p-6 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-bold text-slate-900">{audience.title}</h3>
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-white border border-slate-200 px-2 py-1 rounded-md">
                    {SCORE_LABEL[audience.score]}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">{audience.summary}</p>
                <ul className="mt-3 space-y-1.5 flex-1">
                  {audience.bullets.map((b) => (
                    <li key={b} className="text-xs text-slate-500 flex gap-2">
                      <span className="mt-1.5 h-1 w-1 rounded-full bg-brand-500 shrink-0" />
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={audience.landingHref}
                    className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
                  >
                    Conhecer <ArrowRight size={12} />
                  </Link>
                  <Link
                    href={audience.loginHref}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
                  >
                    Entrar
                  </Link>
                  <Link
                    href={audience.registerHref}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-400"
                  >
                    Cadastrar
                  </Link>
                  <a
                    href={marketingWhatsAppHref(audience.whatsappMessage)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-[#128C7E] hover:bg-emerald-50"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="produtos" className="bg-slate-50 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            O que a Doctor8 faz
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
            Produtos e módulos do ecossistema
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Visão de benefício — cada item aponta para a porta de entrada certa.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MARKETING_PRODUCTS.map((product) => (
              <Link
                key={product.title}
                href={product.href}
                className="group rounded-xl border border-slate-200 bg-white px-4 py-4 hover:border-brand-300 hover:shadow-sm transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900 group-hover:text-brand-700">
                    {product.title}
                  </h3>
                  <ExternalLink size={14} className="text-slate-300 group-hover:text-brand-500 shrink-0 mt-1" />
                </div>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{product.body}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section id="especialidades" className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
            Profissionais
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
            Login e cadastro por especialidade
          </h2>
          <p className="mt-2 max-w-2xl text-slate-600">
            Portal unificado com atalho por perfil — ou cadastro dedicado.
          </p>
          <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {MARKETING_SPECIALTIES.map((s) => (
              <div
                key={s.label}
                className="rounded-xl border border-slate-200 px-4 py-3 flex items-center justify-between gap-3"
              >
                <span className="text-sm font-medium text-slate-900">{s.label}</span>
                <div className="flex gap-2 shrink-0">
                  <Link href={s.loginHref} className="text-xs font-semibold text-brand-700 hover:underline">
                    Entrar
                  </Link>
                  <Link href={s.registerHref} className="text-xs font-semibold text-slate-600 hover:underline">
                    Cadastrar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access table */}
      <section id="acessos" className="bg-slate-950 text-white border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-400">
            Mapa de acessos
          </p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-bold">
            Landing · Login · Cadastro
          </h2>
          <p className="mt-2 max-w-2xl text-slate-400">
            Inventário público para comercial, parceiros e onboarding — sem rotas internas de painel.
          </p>

          <div className="mt-8 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-white/5 text-slate-300">
                <tr>
                  <th className="px-4 py-3 font-semibold">Persona</th>
                  <th className="px-4 py-3 font-semibold">Landing</th>
                  <th className="px-4 py-3 font-semibold">Login</th>
                  <th className="px-4 py-3 font-semibold">Cadastro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {MARKETING_ACCESS_ROWS.map((row) => (
                  <tr key={row.persona} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium text-white">{row.persona}</td>
                    <td className="px-4 py-3">
                      <Link href={row.landing.href} className="text-accent-400 hover:underline">
                        {row.landing.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={row.login.href} className="text-slate-300 hover:text-white hover:underline">
                        {row.login.label}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={row.register.href} className="text-slate-300 hover:text-white hover:underline">
                        {row.register.label}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Model + trust */}
      <section id="modelo" className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                Modelo
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
                Como a Doctor8 gera valor
              </h2>
              <div className="mt-6 space-y-4">
                {MARKETING_MODEL_POINTS.map((point) => (
                  <div key={point.title} className="flex gap-3">
                    <Building2 className="text-brand-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="font-semibold text-slate-900">{point.title}</p>
                      <p className="text-sm text-slate-600 mt-0.5">{point.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                Confiança
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
                Conformidade e rede
              </h2>
              <ul className="mt-6 space-y-3">
                {MARKETING_TRUST.map((item) => (
                  <li key={item} className="flex gap-2.5 text-sm text-slate-700">
                    <ShieldCheck className="text-emerald-600 shrink-0 mt-0.5" size={18} />
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-3 text-sm">
                <Link href="/lgpd" className="text-brand-700 font-medium hover:underline">
                  LGPD
                </Link>
                <Link href="/hipaa" className="text-brand-700 font-medium hover:underline">
                  HIPAA
                </Link>
                <Link href="/docs" className="text-brand-700 font-medium hover:underline">
                  Documentação
                </Link>
                <Link href="/privacy" className="text-brand-700 font-medium hover:underline">
                  Privacidade
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact / capture */}
      <section id="contato" className="bg-slate-50 border-b border-slate-200 scroll-mt-20">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-16">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-14 items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                Captura comercial
              </p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-slate-900">
                Fale com a Doctor8
              </h2>
              <p className="mt-2 text-slate-600 max-w-md">
                Empresas, clínicas, farmácias, labs e parceiros: deixe seus dados ou chame no WhatsApp.
                Profissionais e pacientes podem começar pelo self-serve.
              </p>
              <a
                href={commercialWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1ebe57] transition"
              >
                <MessageCircle size={18} /> Chamar no WhatsApp
              </a>
              <p className="mt-4 text-xs text-slate-500">
                Dica para SDRs e parceiros: compartilhe âncoras como{" "}
                <code className="text-slate-700">/marketing#empresas</code>,{" "}
                <code className="text-slate-700">/marketing#farmacias</code> ou as{" "}
                <Link href="/marketing/estrategias" className="text-brand-700 font-medium hover:underline">
                  estratégias por público
                </Link>
                .
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm">
              <p className="text-sm font-semibold text-slate-900 mb-4">
                Formulário de interesse
              </p>
              <MarketingLeadForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
