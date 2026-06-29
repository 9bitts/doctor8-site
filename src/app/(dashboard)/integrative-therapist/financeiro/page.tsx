import { FinanceiroDashboard } from "@/app/(dashboard)/professional/financeiro/page";

export default function IntegrativeTherapistFinanceiroPage() {
  return (
    <FinanceiroDashboard
      apiPath="/api/integrative-therapist/financeiro"
      showPricingSettings={false}
      showRateio={false}
    />
  );
}
