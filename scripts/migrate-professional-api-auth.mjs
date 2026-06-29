#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = path.join(process.cwd(), "src/app/api/professional");

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, files);
    else if (ent.name === "route.ts") files.push(p);
  }
  return files;
}

function normalize(s) {
  return s.replace(/\r\n/g, "\n");
}

function denormalize(s, original) {
  return original.includes("\r\n") ? s.replace(/\n/g, "\r\n") : s;
}

for (const file of walk(root)) {
  const original = fs.readFileSync(file, "utf8");
  let s = normalize(original);
  if (!s.includes("session.user.role !== \"PROFESSIONAL\"")) continue;
  if (s.includes("requireProfessionalApi")) continue;

  if (s.includes('from "@/lib/auth"')) {
    s = s.replace(
      /import \{ auth \} from "@\/lib\/auth";/,
      'import { requireProfessionalApi, isApiError } from "@/lib/api-auth";',
    );
  } else if (!s.includes("@/lib/api-auth")) {
    s = `import { requireProfessionalApi, isApiError } from "@/lib/api-auth";\n${s}`;
  }

  const authPatterns = [
    /const session = await auth\(\);\n\s*if \(!session\?\.user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n\s*if \(session\.user\.role !== "PROFESSIONAL"\)\n\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);/g,
    /const session = await auth\(\);\n\s*if \(!session\?\.user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\n\s*if \(session\.user\.role !== "PROFESSIONAL"\) return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);/g,
    /const session = await auth\(\);\n\s*if \(!session\?\.user \|\| session\.user\.role !== "PROFESSIONAL"\) \{\n\s*return NextResponse\.json\(\{ error: "(?:Unauthorized|Forbidden)" \}, \{ status: (?:401|403) \} \);\n\s*\}/g,
    /const session = await auth\(\);\n\s*if \(!session\?\.user \|\| session\.user\.role !== "PROFESSIONAL"\) \{\n\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);\n\s*\}/g,
  ];

  for (const re of authPatterns) {
    s = s.replace(re, "const ctx = await requireProfessionalApi();\n  if (isApiError(ctx)) return ctx.error;");
  }

  s = s.replace(/\bsession\.user\.id\b/g, "ctx.userId");

  s = s.replace(
    /const professional = await db\.professionalProfile\.findUnique\(\{\n\s*where: \{ userId: ctx\.userId \},?\n\s*(?:select: \{ id: true \},?\n\s*)?\}\);\n\s*if \(!professional\) return NextResponse\.json\(\{ error: "[^"]+" \}, \{ status: 404 \}\);\n/g,
    "",
  );

  s = s.replace(/\bprofessional\.id\b/g, "ctx.professional.id");

  if (s !== normalize(original)) {
    fs.writeFileSync(file, denormalize(s, original));
    console.log("updated", path.relative(process.cwd(), file));
  }
}
