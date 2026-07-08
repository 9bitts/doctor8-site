import Link from "next/link";
import { Brain, Building2, Stethoscope } from "lucide-react";

const LINKS = [
  {
    href: "/empresas/login",
    icon: Building2,
    title: "Empresa",
    description: "RH, SST e gestão NR-1 / EAP",
    accent: "indigo",
  },
  {
    href: "/empresas/medico/login",
    icon: Stethoscope,
    title: "Médico do trabalho",
    description: "Coordenador PCMSO",
    accent: "teal",
  },
  {
    href: "/empresas/psicologo/login",
    icon: Brain,
    title: "Psicólogo",
    description: "Atendimentos EAP corporativos",
    accent: "violet",
  },
] as const;

const accentClasses = {
  indigo: "border-indigo-200 bg-indigo-50/50 hover:border-indigo-300 text-indigo-700",
  teal: "border-teal-200 bg-teal-50/50 hover:border-teal-300 text-teal-700",
  violet: "border-violet-200 bg-violet-50/50 hover:border-violet-300 text-violet-700",
};

/** Shared hub links for Doctor8 Empresas — one landing, multiple profiles. */
export default function EmpresasAccessLinks({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex flex-wrap justify-center gap-2 text-xs">
        {LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="text-slate-400 hover:text-white transition"
          >
            {item.title}
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div className="grid sm:grid-cols-3 gap-3">
      {LINKS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`rounded-xl border p-4 transition ${accentClasses[item.accent]}`}
        >
          <item.icon size={20} className="mb-2 opacity-80" />
          <p className="font-semibold text-slate-900 text-sm">{item.title}</p>
          <p className="text-xs text-slate-600 mt-1">{item.description}</p>
        </Link>
      ))}
    </div>
  );
}
