const STATUS_COPY: Record<string, { title: string; body: string; className: string }> = {
  PENDING_REVIEW: {
    title: "Farmácia em análise",
    body: "Sua farmácia aguarda aprovação da equipe Doctor8. Você pode visualizar o portal, mas alterações de estoque, pedidos e configurações ficam bloqueadas até a ativação.",
    className: "border-amber-200 bg-amber-50 text-amber-900",
  },
  SUSPENDED: {
    title: "Farmácia suspensa",
    body: "Operações de estoque, pedidos e configurações estão bloqueadas. Entre em contato com o suporte Doctor8.",
    className: "border-red-200 bg-red-50 text-red-900",
  },
};

type Props = {
  status: string;
};

export default function PharmacyStoreStatusBanner({ status }: Props) {
  if (status === "ACTIVE") return null;
  const copy = STATUS_COPY[status] ?? {
    title: "Farmácia indisponível",
    body: "Operações de escrita estão bloqueadas para esta farmácia.",
    className: "border-slate-200 bg-slate-50 text-slate-800",
  };

  return (
    <div className={`rounded-xl border px-4 py-3 text-sm ${copy.className}`}>
      <p className="font-semibold">{copy.title}</p>
      <p className="mt-1 opacity-90">{copy.body}</p>
    </div>
  );
}
