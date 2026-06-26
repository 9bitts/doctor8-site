import { redirect } from "next/navigation";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export default function HumanitarianIndexPage() {
  redirect(`/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`);
}
