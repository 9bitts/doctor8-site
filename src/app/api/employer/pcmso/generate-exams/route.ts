import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { generateExamsFromMatrix } from "@/lib/employer-pcmso-generate";

const schema = z.object({
  gheGroupId: z.string().optional(),
  examTypes: z
    .array(z.enum(["ADMISSIONAL", "PERIODICO", "RETORNO_TRABALHO", "MUDANCA_FUNCAO", "DEMISSIONAL"]))
    .optional(),
});

/** Generate scheduled exams from PCMSO matrix × workforce (by GHE). */
export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await generateExamsFromMatrix({
    employerCompanyId: ctx.employerCompanyId,
    gheGroupId: parsed.data.gheGroupId,
    examTypes: parsed.data.examTypes,
  });

  return NextResponse.json(result);
}
