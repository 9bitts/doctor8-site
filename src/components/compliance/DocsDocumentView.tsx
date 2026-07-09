import Link from "next/link";
import { notFound } from "next/navigation";
import { BrandLogoLink } from "@/components/brand/BrandLogo";
import {
  complianceStatusColors,
  complianceStatusLabels,
  getComplianceDoc,
} from "@/lib/legal/compliance-docs/catalog";
import { sanitizeLegalHtml } from "@/lib/sanitize-html";

type Props = {
  slug: string;
};

export default function DocsDocumentView({ slug }: Props) {
  const doc = getComplianceDoc(slug);
  if (!doc) notFound();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <BrandLogoLink variant="on-dark" size="md" />
          <Link href="/docs" className="text-xs text-slate-400 hover:text-white transition">
            ← Todos os documentos
          </Link>
        </div>
      </nav>

      <header className="bg-slate-900 text-white py-10 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-full border ${complianceStatusColors[doc.status]}`}
            >
              {complianceStatusLabels[doc.status]}
            </span>
            {doc.required ? (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-red-500/20 text-red-200 border-red-500/30">
                Obrigatório
              </span>
            ) : (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full border bg-slate-500/20 text-slate-300 border-slate-500/30">
                Recomendado
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3">{doc.title}</h1>
          <p className="text-slate-400 text-sm">{doc.description}</p>
          <p className="text-slate-500 text-xs mt-3">
            Base legal: {doc.legalBasis} · Atualizado: {doc.lastUpdated}
          </p>
          {doc.canonicalPath && (
            <p className="mt-3">
              <Link
                href={doc.canonicalPath}
                className="text-sm text-emerald-400 hover:underline"
              >
                Ver versão publicada em {doc.canonicalPath} →
              </Link>
            </p>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {doc.sections.map((section, i) => (
            <div key={i} className="p-8 border-b border-slate-100 last:border-0">
              <h2 className="text-lg font-bold text-slate-900 mb-4">{section.title}</h2>
              <div
                className="text-slate-600 text-sm leading-relaxed prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizeLegalHtml(section.content) }}
              />
            </div>
          ))}
        </article>

        <div className="mt-8 flex justify-between text-sm">
          <Link href="/docs" className="text-slate-500 hover:text-slate-800">
            ← Voltar ao índice
          </Link>
          <Link href="/docs#proximos-passos" className="text-emerald-600 hover:text-emerald-800">
            Próximos passos →
          </Link>
        </div>
      </main>
    </div>
  );
}
