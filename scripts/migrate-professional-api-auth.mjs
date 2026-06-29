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

for (const file of walk(root)) {
  let s = fs.readFileSync(file, "utf8");
  if (!s.includes('session.user.role !== "PROFESSIONAL"')) continue;
  if (s.includes("requireProfessionalApi")) continue;

  if (!s.includes("requireProfessionalApi")) {
    if (s.includes('from "@/lib/auth"')) {
      s = s.replace(
        /import \{ auth \} from "@\/lib\/auth";/,
        'import { requireProfessionalApi, isApiError } from "@/lib/api-auth";',
      );
    } else {
      s = `import { requireProfessionalApi, isApiError } from "@/lib/api-auth";\n${s}`;
    }
  }

  // Simple GET handlers: auth + role check only
  s = s.replace(
    /const session = await auth\(\);\s*\n\s*if \(!session\?\.user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\s*\n\s*if \(session\.user\.role !== "PROFESSIONAL"\) return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);/g,
    `const ctx = await requireProfessionalApi();\n  if (isApiError(ctx)) return ctx.error;`,
  );

  s = s.replace(
    /const session = await auth\(\);\s*\n\s*if \(!session\?\.user \|\| session\.user\.role !== "PROFESSIONAL"\) \{\s*\n\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);\s*\n\s*\}/g,
    `const ctx = await requireProfessionalApi();\n  if (isApiError(ctx)) return ctx.error;`,
  );

  fs.writeFileSync(file, s);
  console.log("updated", path.relative(process.cwd(), file));
}
