import { FinanceiroDashboard } from "@/app/(dashboard)/professional/financeiro/page";
import { isStripeConnectEnabled } from "@/lib/stripe-connect";

export default function PsychoanalystFinanceiroPage() {
  return (
    <FinanceiroDashboard
      apiPath="/api/psychoanalyst/financeiro"
      showPricingSettings={false}
      showRateio
      rateioMode="full"
      stripeConnectEnabled={isStripeConnectEnabled()}
      stripeConnectMode="unavailable"
    />
  );
}
