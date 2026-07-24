import Image from "next/image";
import type { ReactNode } from "react";
import { Manrope, Instrument_Sans } from "next/font/google";
import {
  ArrowRight,
  Calendar,
  ExternalLink,
  FileText,
  Mic,
  Sparkles,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import {
  MPV_ASSOCIADO_GANHA,
  MPV_DOCTOR8_BENEFITS,
  MPV_PLANOS,
  MPV_POSTULADOS,
  MPV_STEPS,
  MPV_URLS,
} from "@/lib/medicospelavida-content";

const display = Manrope({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-mpv-display",
});

const body = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mpv-body",
});

const D8_ICONS = [Sparkles, FileText, Video, Calendar, Stethoscope, Users] as const;

function ExtLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

export default function MedicosPelaVidaLanding() {
  return (
    <div
      className={`${display.variable} ${body.variable} mpv-landing min-h-screen text-white`}
      style={{ fontFamily: "var(--font-mpv-body), system-ui, sans-serif" }}
    >
      <style>{`
        .mpv-landing {
          --mpv-ink: #070b10;
          --mpv-ink-2: #0d1520;
          --mpv-blue: #2b9cdb;
          --mpv-blue-deep: #176a88;
          --mpv-green: #2fd35a;
          --mpv-mist: #e8f4fb;
          --mpv-muted: #9bb3c7;
          background: var(--mpv-ink);
        }
        .mpv-display { font-family: var(--font-mpv-display), system-ui, sans-serif; }
        @keyframes mpv-rise {
          from { opacity: 0; transform: translateY(18px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes mpv-ekg {
          0% { stroke-dashoffset: 240; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes mpv-glow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        .mpv-rise { animation: mpv-rise 0.85s ease-out both; }
        .mpv-rise-delay-1 { animation-delay: 0.12s; }
        .mpv-rise-delay-2 { animation-delay: 0.24s; }
        .mpv-rise-delay-3 { animation-delay: 0.36s; }
        .mpv-ekg-line {
          stroke-dasharray: 240;
          animation: mpv-ekg 2.4s ease-out 0.4s both;
        }
        .mpv-hero-glow {
          animation: mpv-glow 6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .mpv-rise, .mpv-rise-delay-1, .mpv-rise-delay-2, .mpv-rise-delay-3,
          .mpv-ekg-line, .mpv-hero-glow { animation: none !important; opacity: 1; transform: none; }
        }
      `}</style>

      {/* Nav */}
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <ExtLink href={MPV_URLS.site} className="opacity-90 transition hover:opacity-100">
            <Image
              src={MPV_URLS.logo}
              alt="Médicos Pela Vida"
              width={160}
              height={160}
              className="h-12 w-auto mix-blend-screen sm:h-14"
              priority
            />
          </ExtLink>
          <div className="flex items-center gap-3 sm:gap-4">
            <BrandLogoLink
              href="/"
              variant="on-dark"
              size="sm"
              className="hidden opacity-80 transition hover:opacity-100 sm:inline-flex"
            />
            <ExtLink
              href={MPV_URLS.cadastro}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--mpv-blue)] px-3.5 py-2 text-sm font-semibold text-white transition hover:brightness-110"
            >
              Associar-se
              <ExternalLink size={14} />
            </ExtLink>
          </div>
        </div>
      </header>

      {/* Hero — brand first, full-bleed */}
      <section className="relative min-h-[100svh] overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 20%, rgba(43,156,219,0.28), transparent 55%), radial-gradient(ellipse 50% 40% at 80% 80%, rgba(47,211,90,0.08), transparent 50%), linear-gradient(180deg, #070b10 0%, #0a1622 55%, #071018 100%)",
          }}
        />
        <div
          className="mpv-hero-glow pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-[var(--mpv-blue)]/20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[var(--mpv-ink)] to-transparent"
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col items-center justify-center px-4 pb-20 pt-28 text-center sm:px-6 sm:pt-32">
          <div className="mpv-rise mb-8">
            <Image
              src={MPV_URLS.logo}
              alt="Médicos Pela Vida"
              width={280}
              height={280}
              className="mx-auto h-36 w-auto mix-blend-screen sm:h-44 md:h-52"
              priority
            />
          </div>

          <h1
            className="mpv-display mpv-rise mpv-rise-delay-1 max-w-3xl text-3xl font-extrabold leading-[1.15] tracking-tight text-white sm:text-5xl md:text-[3.25rem]"
          >
            Unidos pela vida e pela ética médica
          </h1>

          <p className="mpv-rise mpv-rise-delay-2 mt-5 max-w-xl text-base leading-relaxed text-[var(--mpv-muted)] sm:text-lg">
            Associação de profissionais da saúde. Autonomia clínica, informação
            independente e ferramentas digitais para o consultório.
          </p>

          <div className="mpv-rise mpv-rise-delay-3 mt-9 flex flex-wrap items-center justify-center gap-3">
            <ExtLink
              href={MPV_URLS.cadastro}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--mpv-blue)] px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 sm:text-base"
            >
              Associe-se agora
              <ArrowRight size={18} />
            </ExtLink>
            <a
              href="#planos"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-6 py-3.5 text-sm font-medium text-white backdrop-blur transition hover:bg-white/10 sm:text-base"
            >
              Ver planos
            </a>
          </div>

          <svg
            className="mpv-rise mpv-rise-delay-3 mt-12 h-8 w-48 text-[var(--mpv-green)] sm:w-64"
            viewBox="0 0 200 32"
            fill="none"
            aria-hidden
          >
            <path
              className="mpv-ekg-line"
              d="M0 16 H48 L56 16 L64 4 L72 28 L80 16 H200"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </section>

      {/* Quem somos */}
      <section className="border-t border-white/5 bg-[var(--mpv-ink-2)]">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:py-28">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mpv-blue)]">
              Quem somos
            </p>
            <h2
              className="mpv-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            >
              Medicina hipocrática, com coragem e responsabilidade
            </h2>
            <p className="mt-5 text-base leading-relaxed text-[var(--mpv-muted)] sm:text-lg">
              Os Médicos Pela Vida são uma associação civil sem fins lucrativos
              que promove informação científica de qualidade, ética médica e a
              dignidade do ato médico — sem substituir a relação médico–paciente.
            </p>
          </div>
          <ul className="space-y-4 self-center">
            {MPV_POSTULADOS.map((item) => (
              <li
                key={item}
                className="flex gap-3 border-l-2 border-[var(--mpv-green)] pl-4 text-sm leading-relaxed text-white/90 sm:text-base"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* O que o associado ganha */}
      <section className="bg-[var(--mpv-mist)] text-[var(--mpv-ink)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mpv-blue-deep)]">
            Para o médico
          </p>
          <h2 className="mpv-display mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl">
            O que muda no seu dia a dia ao associar-se
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600">
            Comunidade, atualização e voz institucional — além da parceria com a
            Doctor8 para a rotina digital do consultório.
          </p>
          <div className="mt-12 grid gap-8 sm:grid-cols-2">
            {MPV_ASSOCIADO_GANHA.map((item, i) => (
              <div key={item.title} className="relative pl-0">
                <span className="mpv-display text-sm font-bold text-[var(--mpv-blue)]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mpv-display mt-2 text-xl font-bold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="scroll-mt-8 bg-white text-[var(--mpv-ink)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mpv-blue-deep)]">
              Planos
            </p>
            <h2 className="mpv-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Escolha sua contribuição
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Mensal ou anual (economize cerca de 10% no anual). O pagamento é
              feito no portal da associação — PIX ou cartão seguro (Cielo).
            </p>
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MPV_PLANOS.map((plano) => (
              <ExtLink
                key={plano.id}
                href={MPV_URLS.cadastro}
                className="group flex flex-col rounded-2xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-[var(--mpv-blue)] hover:bg-white"
              >
                <span className="mpv-display text-lg font-bold text-[var(--mpv-ink)]">
                  {plano.name}
                </span>
                <span className="mt-1 text-xs leading-snug text-slate-500">{plano.label}</span>
                <div className="mt-6 space-y-1">
                  <p className="mpv-display text-2xl font-extrabold text-[var(--mpv-blue-deep)]">
                    {plano.monthly}
                    <span className="text-sm font-semibold text-slate-400">/mês</span>
                  </p>
                  <p className="text-sm text-slate-500">
                    ou <strong className="text-slate-700">{plano.yearly}</strong>/ano
                  </p>
                </div>
                <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-semibold text-[var(--mpv-blue)] group-hover:gap-2.5 transition-all">
                  Associar-se
                  <ExternalLink size={14} />
                </span>
              </ExtLink>
            ))}
          </div>

          <p className="mt-6 text-xs text-slate-500">
            Contribuições destinam-se à manutenção da associação.{" "}
            <ExtLink href={MPV_URLS.termos} className="underline underline-offset-2 hover:text-slate-700">
              Termos de uso
            </ExtLink>
            .
          </p>
        </div>
      </section>

      {/* Parceria Doctor8 */}
      <section id="parceria" className="scroll-mt-8 bg-[var(--mpv-ink)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mpv-green)]">
                Parceria Doctor8
              </p>
              <h2 className="mpv-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Plataforma digital enquanto sua associação estiver em dia
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--mpv-muted)]">
                Quem mantém o pagamento da associação continua com acesso ao
                Doctor8 — agenda, teleconsulta, assinatura digital, arquivo do
                paciente e apoio de IA na rotina clínica.
              </p>
            </div>
            <BrandLogoLink href="/" variant="on-dark" size="lg" />
          </div>

          <div className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {MPV_DOCTOR8_BENEFITS.map((item, i) => {
              const Icon = D8_ICONS[i] ?? Mic;
              return (
                <div key={item.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--mpv-blue)]/15 text-[var(--mpv-blue)]">
                    <Icon size={20} />
                  </div>
                  <div>
                    <h3 className="mpv-display font-bold text-white">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--mpv-muted)]">
                      {item.body}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="border-t border-white/5 bg-[var(--mpv-ink-2)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mpv-blue)]">
            Como funciona
          </p>
          <h2 className="mpv-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Quatro passos até o consultório digital
          </h2>
          <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {MPV_STEPS.map((step) => (
              <li key={step.n}>
                <span className="mpv-display text-3xl font-extrabold text-[var(--mpv-blue)]/40">
                  {step.n}
                </span>
                <h3 className="mpv-display mt-2 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--mpv-muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12">
            <ExtLink
              href={MPV_URLS.cadastro}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--mpv-green)] px-6 py-3.5 text-sm font-bold text-[var(--mpv-ink)] transition hover:brightness-110"
            >
              Ir para o cadastro MPV
              <ExternalLink size={16} />
            </ExtLink>
          </div>
        </div>
      </section>

      {/* Redes + CTA */}
      <section className="bg-[var(--mpv-mist)] text-[var(--mpv-ink)]">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--mpv-blue-deep)]">
                Comunidade
              </p>
              <h2 className="mpv-display mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Acompanhe lives e conversas
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600">
                Canal no Telegram, lives no YouTube e contato direto pelo WhatsApp
                da associação.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ExtLink
                  href={MPV_URLS.telegram}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--mpv-blue)]"
                >
                  Telegram
                </ExtLink>
                <ExtLink
                  href={MPV_URLS.youtube}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--mpv-blue)]"
                >
                  YouTube @mpvlives
                </ExtLink>
                <ExtLink
                  href={MPV_URLS.whatsapp}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--mpv-blue)]"
                >
                  WhatsApp
                </ExtLink>
                <ExtLink
                  href={MPV_URLS.site}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-[var(--mpv-blue)]"
                >
                  Site editorial
                </ExtLink>
              </div>
            </div>
            <div className="rounded-2xl bg-[var(--mpv-ink)] p-8 text-white sm:min-w-[280px]">
              <h3 className="mpv-display text-xl font-bold">Pronto para associar-se?</h3>
              <p className="mt-2 text-sm text-[var(--mpv-muted)]">
                Cadastro e pagamento no portal oficial da MPV.
              </p>
              <ExtLink
                href={MPV_URLS.cadastro}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--mpv-blue)] px-5 py-3 text-sm font-semibold transition hover:brightness-110"
              >
                Cadastre-se
                <ArrowRight size={16} />
              </ExtLink>
              <ExtLink
                href={MPV_URLS.portal}
                className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-5 py-3 text-sm font-medium text-white/90 transition hover:bg-white/5"
              >
                Apoiar / doar
              </ExtLink>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[var(--mpv-ink)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-[var(--mpv-muted)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-4">
            <Image
              src={MPV_URLS.logo}
              alt=""
              width={48}
              height={48}
              className="h-10 w-auto mix-blend-screen opacity-90"
            />
            <p>
              Médicos Pela Vida · CNPJ 19.548.229/0001-93
              <br />
              Parceria com Doctor8
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <ExtLink href={MPV_URLS.email} className="hover:text-white">
              contato@medicospelavidacovid19.com.br
            </ExtLink>
            <ExtLink href={MPV_URLS.termos} className="hover:text-white">
              Termos
            </ExtLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
