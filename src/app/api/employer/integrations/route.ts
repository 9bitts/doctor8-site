import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { getEmployerIntegrationStatus } from "@/lib/employer-integrations";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const integrations = getEmployerIntegrationStatus();
  const liveCount = integrations.filter((i) => i.mode === "live").length;

  return NextResponse.json({
    integrations,
    summary: {
      total: integrations.length,
      live: liveCount,
      demo: integrations.length - liveCount,
      message:
        liveCount === 0
          ? "Todas as integrações estão em modo demonstração. Configure as variáveis de ambiente após contratar os parceiros."
          : `${liveCount} integração(ões) em produção, ${integrations.length - liveCount} em modo demo.`,
    },
  });
}
