import { redirect } from "next/navigation";

/** Legacy footer link — compliance hub lives at /docs. */
export default function LgpdRedirectPage() {
  redirect("/docs");
}
