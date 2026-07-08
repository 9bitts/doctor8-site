"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Pill, ExternalLink } from "lucide-react";
import PatientPharmacyBuyPanel from "@/components/patient/PatientPharmacyBuyPanel";

export default function PatientPharmacyBuyPage() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get("storeId") ?? undefined;
  const drugId = searchParams.get("drugId") ?? undefined;
  const prescriptionId = searchParams.get("prescriptionId") ?? undefined;

  const [med, setMed] = useState<{ name: string; dosage?: string } | null>(null);
  const [loading, setLoading] = useState(Boolean(drugId));

  useEffect(() => {
    if (!drugId) {
      setLoading(false);
      return;
    }
    fetch(`/api/patient/pharmacy/search?drugCatalogId=${drugId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const hit = data?.results?.[0];
        if (hit) setMed({ name: hit.name, dosage: hit.presentation });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [drugId]);

  const medications = med
    ? [med]
    : prescriptionId
      ? []
      : [{ name: "Medicamento", dosage: "" }];

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBagIcon />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Comprar na rede Doctor8</h1>
          <p className="text-sm text-slate-500">Farmácias parceiras com preço e entrega</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={28} />
        </div>
      ) : prescriptionId ? (
        <PatientPharmacyBuyPanel
          prescriptionId={prescriptionId}
          medications={medications.length ? medications : [{ name: "Receita" }]}
          preselectedStoreId={storeId}
        />
      ) : drugId && med ? (
        <PatientPharmacyBuyPanel
          drugCatalogIds={[drugId]}
          medications={[med]}
          preselectedStoreId={storeId}
        />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center space-y-4">
          <Pill className="mx-auto text-emerald-500" size={36} />
          <p className="text-slate-600">
            Para comprar, use uma receita assinada ou busque um medicamento no marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/patient/prescriptions"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-sm"
            >
              Minhas receitas
            </Link>
            <Link
              href="/patient/medications"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm"
            >
              Buscar medicamentos
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      )}

      <Link href="/patient/pharmacy/orders" className="text-sm text-slate-500 hover:text-slate-700">
        Ver histórico de pedidos →
      </Link>
    </div>
  );
}

function ShoppingBagIcon() {
  return (
    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
      <Pill className="text-emerald-700" size={22} />
    </div>
  );
}
