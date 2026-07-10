import type { Lang } from "@/lib/i18n/translations";

const COPY: Record<Lang, { title: string; body: string }> = {
  pt: {
    title: "Aviso — atendimento transfronteiriço",
    body: "Profissionais voluntários são habilitados no Brasil (CFM/conselho). Este serviço humanitário não substitui emergências locais na Venezuela. Orientações e prescrições digitais brasileiras (ICP-Brasil) podem não ter validade em farmácias ou sistemas de saúde venezuelanos. Em emergência, procure serviços locais.",
  },
  en: {
    title: "Notice — cross-border care",
    body: "Volunteer professionals are licensed in Brazil (CFM/council). This humanitarian service does not replace local emergency care in Venezuela. Brazilian digital prescriptions (ICP-Brasil) may not be valid in Venezuelan pharmacies or health systems. In an emergency, seek local services.",
  },
  es: {
    title: "Aviso — atención transfronteriza",
    body: "Los profesionales voluntarios están habilitados en Brasil (CFM/consejo). Este servicio humanitario no reemplaza la atención de emergencia local en Venezuela. Las prescripciones digitales brasileñas (ICP-Brasil) pueden no ser válidas en farmacias o sistemas de salud venezolanos. En emergencia, acuda a servicios locales.",
  },
};

export function CrossBorderNotice({ lang }: { lang: Lang }) {
  const c = COPY[lang] ?? COPY.es;
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      <p className="font-semibold text-amber-200">{c.title}</p>
      <p className="mt-1 opacity-90">{c.body}</p>
    </div>
  );
}
