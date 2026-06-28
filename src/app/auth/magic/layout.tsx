import { Suspense } from "react";
import MagicLinkPage from "./page";
import MagicLinkFallback from "./MagicLinkFallback";

export default function MagicLinkLayout() {
  return (
    <Suspense fallback={<MagicLinkFallback />}>
      <MagicLinkPage />
    </Suspense>
  );
}
