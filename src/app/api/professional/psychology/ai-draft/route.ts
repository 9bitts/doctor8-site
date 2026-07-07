import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePsychologyNoteDraft } from "@/lib/ai-psychology-notes";
import { isPsychologyAiNotesEnabled, isPsychologyRiskAlertsEnabled } from "@/lib/psychology-feature-flags";
import { requirePsychologist } from "@/lib/psychology-api";
import { SESSION_FORMATS, type SessionFormat } from "@/lib/psychology-templates";
import { assessNoteTextRisk } from "@/lib/psychology-risk";
import type { Lang } from "@/lib/i18n/translations";

const schema = z.object({
  format: z.enum(["DAP", "BIRP", "SOAP", "FREE"]),
  rawNotes: z.string().min(10).max(12000),
  lang: z.enum(["pt", "en", "es"]).optional(),
  durationMins: z.number().int().min(1).max(300).optional(),
  patientName: z.string().optional(),
});

export async function POST(req: NextRequest) {
  if (!isPsychologyAiNotesEnabled()) {
    return NextResponse.json({ error: "Feature disabled" }, { status: 503 });
  }

  const ctx = await requirePsychologist();
  if ("error" in ctx && ctx.error) return ctx.error;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const format = parsed.data.format as SessionFormat;
  const formatDef = SESSION_FORMATS.find((f) => f.id === format);
  if (!formatDef) return NextResponse.json({ error: "Invalid format" }, { status: 400 });

  const lang = (parsed.data.lang ?? "pt") as Lang;

  try {
    const fields = await generatePsychologyNoteDraft({
      lang,
      format,
      fieldKeys: formatDef.fields.map((f) => f.key),
      rawNotes: parsed.data.rawNotes,
      patientName: parsed.data.patientName,
      durationMins: parsed.data.durationMins,
    });

    const risk = isPsychologyRiskAlertsEnabled()
      ? assessNoteTextRisk(parsed.data.rawNotes + " " + Object.values(fields).join(" "))
      : null;

    return NextResponse.json({ fields, risk });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI_ERROR";
    if (msg === "AI_NOT_CONFIGURED") return NextResponse.json({ error: msg }, { status: 503 });
    if (msg === "NO_CONTENT") return NextResponse.json({ error: msg }, { status: 400 });
    return NextResponse.json({ error: "AI_REQUEST_FAILED" }, { status: 502 });
  }
}
