import { NextRequest, NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { sendEmployerWorkforceInvite } from "@/lib/email";
import { randomBytes } from "crypto";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;

  const member = await db.employerWorkforceMember.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!member) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const [company, eap] = await Promise.all([
    db.employerCompany.findUnique({
      where: { id: ctx.employerCompanyId },
      select: { nomeFantasia: true },
    }),
    db.employerEapBenefit.findUnique({ where: { employerCompanyId: ctx.employerCompanyId } }),
  ]);

  const token = member.inviteToken ?? randomBytes(24).toString("hex");
  const updated = await db.employerWorkforceMember.update({
    where: { id: member.id },
    data: {
      inviteToken: token,
      status: "INVITED",
      invitedAt: new Date(),
    },
  });

  const sessionsPerYear = member.sessionsQuota ?? eap?.sessionsPerEmployee ?? 6;

  try {
    await sendEmployerWorkforceInvite({
      email: member.email,
      firstName: member.firstName,
      companyName: company?.nomeFantasia || "Empresa",
      sessionsPerYear,
      token,
      language: "pt",
    });
  } catch (emailErr) {
    console.error("[EMPLOYER WORKFORCE INVITE EMAIL]", emailErr);
    return NextResponse.json({ error: "Email send failed" }, { status: 502 });
  }

  return NextResponse.json({ success: true, member: updated });
}
