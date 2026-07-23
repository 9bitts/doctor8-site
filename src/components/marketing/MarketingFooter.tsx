import Link from "next/link";

const AUDIENCE_LINKS = [
  { label: "Mapa do ecossistema", href: "/marketing" },
  { label: "Estratégias por público", href: "/marketing/estrategias" },
  { label: "Pressão alta", href: "/hipertensao" },
  { label: "Diabetes", href: "/diabetes" },
  { label: "Ansiedade", href: "/ansiedade" },
  { label: "Depressão", href: "/depressao" },
  { label: "Empresas", href: "/empresas" },
  { label: "Pacientes", href: "/pacientes" },
  { label: "Especialistas", href: "/especialistas" },
  { label: "Parceiros", href: "/parceiros" },
  { label: "Farmácias", href: "/farmacias" },
  { label: "Laboratórios", href: "/laboratorios" },
];

const LEGAL_LINKS = [
  { label: "Privacidade", href: "/privacy" },
  { label: "Termos de uso", href: "/terms" },
  { label: "LGPD", href: "/docs" },
];

export default function MarketingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-10 sm:py-12">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="font-bold text-slate-900 text-lg">Doctor8</p>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-xs">
              Ecossistema de saúde digital para pacientes, profissionais, empresas e parceiros.
              LGPD e HIPAA.
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
              Audiências
            </p>
            <ul className="space-y-2">
              {AUDIENCE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-700 hover:text-brand-600 transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
              Acesso rápido
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li>
                <Link href="/marketing#acessos" className="hover:text-brand-600 transition">Todos os acessos</Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-brand-600 transition">Entrar</Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-brand-600 transition">Cadastrar-se</Link>
              </li>
              <li>
                <Link href="/empresas/cadastro" className="hover:text-brand-600 transition">Demo empresarial</Link>
              </li>
              <li>
                <Link href="/marketing#contato" className="hover:text-brand-600 transition">Falar com comercial</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">
              Legal
            </p>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-slate-700 hover:text-brand-600 transition">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200 text-center space-y-1">
          <p className="text-xs text-slate-600">
            Portaria MTE nº 1.419/2024 · NR-1 · NR-7 (PCMSO) · NR-17 (AEP) · eSocial S-2220/S-2240
          </p>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} Doctor8. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
