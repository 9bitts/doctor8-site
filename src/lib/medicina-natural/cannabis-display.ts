import type { DetalhesCannabis } from "@/lib/medicina-natural/item-types";

export function parseDetalhesCannabis(raw: unknown): DetalhesCannabis | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<DetalhesCannabis>;
  if (!d.espectro || !d.canabinoideDominante || !d.formaFarmaceutica || !d.tipoReceituario) {
    return null;
  }
  return d as DetalhesCannabis;
}

export function formatCannabisComposition(d: DetalhesCannabis): string {
  const parts: string[] = [];
  parts.push(d.espectro.replace(/_/g, " "));
  if (d.concentracaoCbdMgMl != null) parts.push(`CBD ${d.concentracaoCbdMgMl} mg/mL`);
  if (d.concentracaoThcMgMl != null) parts.push(`THC ${d.concentracaoThcMgMl} mg/mL`);
  if (d.proporcaoCbdThc) parts.push(`CBD:THC ${d.proporcaoCbdThc}`);
  if (d.outrosCanabinoides) parts.push(d.outrosCanabinoides);
  if (d.volumeEmbalagem) parts.push(d.volumeEmbalagem);
  return parts.join(" · ");
}

export function cannabisReceituarioBadgeKey(tipo: "A" | "B"): string {
  return tipo === "A" ? "rx.cannabis.receituarioA" : "rx.cannabis.receituarioB";
}

export function cannabisFormaFarmaceuticaKey(
  forma: DetalhesCannabis["formaFarmaceutica"],
): string {
  return `rx.cannabis.forma.${forma}`;
}
