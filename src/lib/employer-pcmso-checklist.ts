export type PcmsoChecklistItem = {
  id: string;
  label: string;
  done: boolean;
};

export const DEFAULT_PCMSO_CHECKLIST: PcmsoChecklistItem[] = [
  { id: "pgr_linked", label: "PGR atualizado com riscos psicossociais identificados", done: false },
  { id: "coord_assigned", label: "Médico coordenador PCMSO designado e contato registrado", done: false },
  { id: "mental_screening", label: "Triagem de saúde mental prevista nos exames (funções expostas)", done: false },
  { id: "referral_protocol", label: "Protocolo de encaminhamento para EAP / serviço especializado", done: false },
  { id: "eap_communication", label: "Comunicação aos colaboradores sobre benefício EAP (sigilo)", done: false },
  { id: "return_to_work", label: "Fluxo de retorno ao trabalho pós-afastamento psíquico documentado", done: false },
  { id: "annual_review", label: "Revisão anual integrada PGR + PCMSO registrada", done: false },
];

export function parsePcmsoChecklist(raw: unknown): PcmsoChecklistItem[] {
  if (!Array.isArray(raw)) return DEFAULT_PCMSO_CHECKLIST.map((i) => ({ ...i }));
  return DEFAULT_PCMSO_CHECKLIST.map((def) => {
    const found = raw.find((x) => typeof x === "object" && x && (x as PcmsoChecklistItem).id === def.id);
    if (found && typeof found === "object" && "done" in found) {
      return { ...def, done: Boolean((found as PcmsoChecklistItem).done) };
    }
    return { ...def };
  });
}

export function pcmsoCompletionPercent(items: PcmsoChecklistItem[]): number {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.done).length;
  return Math.round((done / items.length) * 100);
}
