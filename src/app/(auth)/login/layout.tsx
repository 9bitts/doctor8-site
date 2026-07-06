import type { Metadata } from "next";
import { buildRootMetadata } from "@/lib/site-metadata";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildRootMetadata({
  title: "Entrar | Doctor8",
});

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
