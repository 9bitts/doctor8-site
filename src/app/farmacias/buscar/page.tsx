import FarmaciasBuscarClient from "@/components/pharmacy-store/FarmaciasBuscarClient";

export const metadata = {
  title: "Buscar preços — Doctor8 Farmácias",
  description: "Consulte preços publicados por farmácias parceiras na rede Doctor8.",
};

export default function FarmaciasBuscarPage() {
  return <FarmaciasBuscarClient />;
}
