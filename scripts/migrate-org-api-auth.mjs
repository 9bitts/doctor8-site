#!/usr/bin/env node
import fs from "fs";
import path from "path";

const root = path.join(process.cwd(), "src/app/api/organization");

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
  if (!s.includes("requireOrganization(")) continue;

  if (!s.includes("requireOrganizationApi")) {
    s = s.replace(
      /import \{ requireOrganization(?:,\s*([^}]+))?\} from "@\/lib\/organization-auth";/,
      (_m, rest) => {
        const extra = rest ? rest.trim() : "";
        const orgImport = extra
          ? `import { ${extra} } from "@/lib/organization-auth";\n`
          : "";
        return `import { requireOrganizationApi, isApiError } from "@/lib/api-auth";\n${orgImport}`;
      },
    );
  }

  s = s.replace(/requireOrganization\(/g, "requireOrganizationApi(");
  s = s.replace(/if \("error" in ctx\) return ctx\.error;/g, "if (isApiError(ctx)) return ctx.error;");

  fs.writeFileSync(file, s);
  console.log("updated", path.relative(process.cwd(), file));
}
