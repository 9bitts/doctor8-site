import { FinanceiroDashboard } from "@/app/(dashboard)/professional/financeiro/page";

export default function PsychoanalystFinanceiroPage() {
  return (
    <FinanceiroDashboard
      apiPath="/api/psychoanalyst/financeiro"
      showPricingSettings={false}
      showRateio={false}
    />
  );
}
