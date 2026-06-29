#!/usr/bin/env node
/** Fix professional routes partially migrated (auth() left but ctx.userId used). */
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

const AUTH_RE =
  /const session = await auth\(\);\s*\n(?:\s*if \(!session\?\.user(?: \|\| session\.user\.role !== "PROFESSIONAL")?\)[\s\S]*?\n)*\s*(?:if \(session\.user\.role !== "PROFESSIONAL"\)[\s\S]*?\n\s*)?/g;

for (const file of walk(root)) {
  let s = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (!s.includes("await auth()") || !s.includes("ctx.userId")) continue;

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

  s = s.replace(AUTH_RE, "const ctx = await requireProfessionalApi();\n  if (isApiError(ctx)) return ctx.error;\n\n  ");

  fs.writeFileSync(file, s);
  console.log("fixed", path.relative(process.cwd(), file));
}
