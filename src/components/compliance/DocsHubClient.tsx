"use client";

import Link from "next/link";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import {
  allComplianceDocs,
  complianceStatusColors,
  complianceStatusLabels,
} from "@/lib/legal/compliance-docs/catalog";
import { complianceHubIntro, complianceNextSteps } from "@/lib/legal/compliance-docs/next-steps";

export default function DocsHubClient() {
  const required = allComplianceDocs.filter((d) => d.required);
  const recommended = allComplianceDocs.filter((d) => !d.required);

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <BrandLogoLink variant="on-dark" size="md" />
          <Link
            href="/privacy"
            className="text-xs text-slate-400 hover:text-white transition"
          >
            Política de Privacidade
          </Link>
        </div>
      </nav>

      <header className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-4 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            LGPD + Telemedicina
          </span>
          <h1 className="text-3xl font-bold mb-3">{complianceHubIntro.title}</h1>
          <p className="text-slate-400 text-sm">{complianceHubIntro.subtitle}</p>
          <p className="text-slate-300 text-sm mt-4 leading-relaxed">{complianceHubIntro.description}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        <DocGroup title="Documentos obrigatórios" docs={required} />
        <DocGroup title="Documentos recomendados" docs={recommended} />

        <section
          id="proximos-passos"
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-20"
        >
          <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-amber-50 to-orange-50">
            <h2 className="text-xl font-bold text-slate-900">Próximos passos</h2>
            <p className="text-slate-600 text-sm mt-2">
              Ações prioritárias para consolidar a conformidade da Doctor8. Itens ordenados por prioridade.
            </p>
          </div>
          <ol className="divide-y divide-slate-100">
            {complianceNextSteps.map((step) => (
              <li key={step.priority} className="p-6 flex gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-900 text-white text-sm font-bold flex items-center justify-center">
                  {step.priority}
                </span>
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900">{step.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 leading-relaxed">{step.description}</p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs text-slate-500">
                    <span>
                      <strong className="text-slate-700">Responsável:</strong> {step.owner}
                    </span>
                    {step.deadline && (
                      <span>
                        <strong className="text-slate-700">Prazo:</strong> {step.deadline}
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-slate-900 text-white rounded-2xl p-8">
          <h2 className="text-lg font-bold mb-4">Contatos</h2>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Encarregado (DPO)</p>
              <a href="mailto:dpo@doctor8.org" className="text-emerald-400 hover:underline">
                dpo@doctor8.org
              </a>
            </div>
            <div>
              <p className="text-slate-400">Controladoria / Privacidade</p>
              <a href="mailto:controladoria@doctor8.com.br" className="text-emerald-400 hover:underline">
                controladoria@doctor8.com.br
              </a>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-6">
            Última atualização do portal: Julho de 2026 · {allComplianceDocs.length} documentos
          </p>
        </section>
      </main>
    </div>
  );
}

function DocGroup({
  title,
  docs,
}: {
  title: string;
  docs: typeof allComplianceDocs;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-500 mt-1">{docs.length} documento(s)</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {docs.map((doc) => (
          <li key={doc.slug}>
            <Link
              href={`/docs/${doc.slug}`}
              className="block px-6 py-5 hover:bg-slate-50 transition group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="font-semibold text-slate-900 group-hover:text-emerald-700 transition">
                    {doc.title}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{doc.description}</p>
                  <p className="text-xs text-slate-400 mt-2">{doc.legalBasis}</p>
                </div>
                <span
                  className={`flex-shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${complianceStatusColors[doc.status]}`}
                >
                  {complianceStatusLabels[doc.status]}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
