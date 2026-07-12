const STATUS_COPY: Record<string, { title: string; body: string; className: string }> = {
  PENDING_REVIEW: {
    title: "Laboratório em análise",
    body: "Seu laboratório aguarda aprovação da equipe Doctor8. Você pode visualizar o portal, mas alterações de exames e configurações ficam bloqueadas até a ativação.",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  SUSPENDED: {
    title: "Laboratório suspenso",
    body: "Operações de exames e configurações estão bloqueadas. Entre em contato com o suporte Doctor8.",
    className: "border-red-200 bg-red-50 text-red-900",
  },
};

type Props = {
  status: string;
};

export default function LaboratoryStatusBanner({ status }: Props) {
  if (status === "ACTIVE") return null;
  const copy = STATUS_COPY[status] ?? {
    title: "Laboratório indisponível",
    body: "Operações de escrita estão bloqueadas para este laboratório.",
    className: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${copy.className}`}>
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1 opacity-90">{copy.body}</p>
    </div>
  );
}
