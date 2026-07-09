import Link from "next/link";
import { Upload, MapPin, Receipt, FileText, ArrowRight } from "lucide-react";
import { LABORATORY_REGISTER } from "@/lib/laboratory-portal";

const STEPS = [
  {
    icon: Upload,
    title: "Suba sua tabela de exames",
    body: "Importe CSV com nome e preço de cada exame — análises clínicas, imagem ou ambos.",
  },
  {
    icon: MapPin,
    title: "Informe o endereço",
    body: "Pacientes Doctor8 encontrarão seu laboratório pela proximidade quando a rede estiver ativa.",
  },
  {
    icon: FileText,
    title: "Receba pedidos integrados",
    body: "Solicitações de exames emitidas por médicos Doctor8 chegam direto ao seu painel.",
  },
  {
    icon: Receipt,
    title: "Taxa por exame realizado",
    body: "Sem mensalidade. Cobramos apenas uma taxa mínima por exame concluído na rede.",
  },
];

export default function LaboratoriosMarketingLanding() {
  return (
    <div className="bg-white">
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Seu laboratório na rede Doctor8
          </h2>
          <p className="text-slate-600 mt-4 text-lg leading-relaxed">
            Cadastre-se grátis, publique preços de exames de sangue e de imagem e prepare-se
            para receber pacientes que buscam o laboratório mais perto — com receita digital integrada.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-2xl border border-slate-200 p-6 bg-slate-50/50">
                <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-10 rounded-2xl border border-violet-100 bg-violet-50/60 p-6 sm:p-8">
          <h3 className="font-bold text-slate-900 text-lg">Um login, três perfis de laboratório</h3>
          <p className="text-slate-600 text-sm mt-2 leading-relaxed max-w-3xl">
            No cadastro você informa se o laboratório é de <strong>análises clínicas</strong> (sangue),
            de <strong>exames de imagem</strong> (raio-X, tomografia, ressonância etc.) ou{" "}
            <strong>ambos</strong>. O tipo aparece no painel e orienta a importação do CSV — sem precisar
            de logins separados.
          </p>
        </div>

        <div className="mt-10 rounded-2xl bg-violet-600 text-white p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">Comece agora — é grátis</h3>
            <p className="text-violet-100 mt-2 text-sm max-w-lg">
              Faça upload da sua tabela de preços em CSV ou cadastre exame a exame.
              Quanto antes publicar, antes aparece para pacientes na região.
            </p>
          </div>
          <Link
            href={LABORATORY_REGISTER}
            className="inline-flex items-center gap-2 bg-white text-violet-800 font-bold px-6 py-3 rounded-xl hover:bg-violet-50 transition shrink-0"
          >
            Cadastrar laboratório <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
