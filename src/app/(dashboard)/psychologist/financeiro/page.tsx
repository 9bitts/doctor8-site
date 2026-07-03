import { FinanceiroDashboard } from "@/app/(dashboard)/professional/financeiro/page";
import { isStripeConnectEnabled } from "@/lib/stripe-connect";

export default function PsychologistFinanceiroPage() {
  return (
    <FinanceiroDashboard stripeConnectEnabled={isStripeConnectEnabled()} />
  );
}
