import { FinanceiroDashboard } from "@/app/(dashboard)/professional/financeiro/page";
import IntegrativeProductionReport from "@/components/integrative-therapist/IntegrativeProductionReport";
import { isStripeConnectEnabled } from "@/lib/stripe-connect";

export default function IntegrativeTherapistFinanceiroPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <IntegrativeProductionReport />
      <FinanceiroDashboard
        apiPath="/api/integrative-therapist/financeiro"
        showPricingSettings
        showRateio
        rateioMode="full"
        stripeConnectEnabled={isStripeConnectEnabled()}
        stripeConnectMode="unavailable"
        pricingSettingsProps={{
          profileApiPath: "/api/integrative-therapist/profile",
          pricingPatchPath: "/api/integrative-therapist/profile/pricing",
          showSessionDuration: true,
          accent: "teal",
        }}
      />
    </div>
  );
}
