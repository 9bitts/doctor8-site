import Link from "next/link";
import { Upload, MapPin, Receipt, ShieldCheck, ArrowRight } from "lucide-react";

const STEPS = [
  {
    icon: Upload,
    title: "Suba seu estoque",
    body: "Importe CSV com preços (GGREM, nome ou drug_catalog_id) ou cadastre manualmente.",
  },
  {
    icon: MapPin,
    title: "Informe o endereço",
    body: "Pacientes Doctor8 encontrarão sua farmácia pela proximidade quando a rede estiver ativa.",
  },
  {
    icon: Receipt,
    title: "100% gratuito agora",
    body: "Sem mensalidade e sem taxa por venda neste momento de adesão. Cadastre, publique preços e entre na rede.",
  },
  {
    icon: ShieldCheck,
    title: "Receita integrada",
    body: "Validação de receitas Doctor8 na bancada, com rastro para dispensação futura (SNCR).",
  },
];

export default function FarmaciasMarketingLanding() {
  return (
    <div className="bg-white">
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">
            Sua farmácia na rede Doctor8
          </h2>
          <p className="text-slate-600 mt-4 text-lg leading-relaxed">
            Cadastre-se grátis, publique preços de balcão e prepare-se para receber pacientes
            que buscam o medicamento mais perto — sem mensalidade e sem taxa por venda nesta fase.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="rounded-2xl border border-slate-200 p-6 bg-slate-50/50">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h3 className="font-bold text-slate-900">{step.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{step.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-14 rounded-2xl bg-emerald-600 text-white p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold">Comece agora — cadastro gratuito</h3>
            <p className="text-emerald-100 mt-2 text-sm max-w-lg">
              Sem mensalidade e sem taxa por venda nesta fase de adesão.
              Publique preços em CSV ou item a item e apareça para pacientes na região.
            </p>
          </div>
          <Link
            href="/farmacias/cadastro"
            className="inline-flex items-center gap-2 bg-white text-emerald-800 font-bold px-6 py-3 rounded-xl hover:bg-emerald-50 transition shrink-0"
          >
            Cadastrar farmácia <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
