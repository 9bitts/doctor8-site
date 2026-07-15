-- Stripe ids for Doctor8 import fee (BRL) checkout
ALTER TABLE "ImportOrder" ADD COLUMN "stripePaymentIntentId" TEXT;
ALTER TABLE "ImportOrder" ADD COLUMN "stripeCheckoutSessionId" TEXT;

CREATE UNIQUE INDEX "ImportOrder_stripePaymentIntentId_key" ON "ImportOrder"("stripePaymentIntentId");
CREATE UNIQUE INDEX "ImportOrder_stripeCheckoutSessionId_key" ON "ImportOrder"("stripeCheckoutSessionId");
