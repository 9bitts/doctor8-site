export default function PcmsoPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Integração PCMSO (NR-7)</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 text-sm text-slate-600 leading-relaxed">
        <p>
          Quando riscos psicossociais são identificados no PGR, o PCMSO deve prever triagem de saúde mental nos
          exames ocupacionais e protocolo de encaminhamento ao médico do trabalho (Nota Técnica SEI nº 4655/2024/MTE).
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Vincule o médico coordenador do PCMSO da empresa</li>
          <li>Receba alertas quando inventário apontar risco alto/crítico em setores específicos</li>
          <li>Encaminhe colaboradores ao EAP sem compartilhar prontuário clínico com o empregador</li>
        </ul>
        <p className="text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Módulo de workflow PCMSO (convite médico do trabalho + checklist NR-7) — disponível na próxima iteração.
          Enquanto isso, use a exportação PGR em Documentação para compartilhar com o SESMT/PCMSO.
        </p>
      </div>
    </div>
  );
}
