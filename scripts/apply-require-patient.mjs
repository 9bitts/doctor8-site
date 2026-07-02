import fs from "fs";
import path from "path";

const root = path.resolve("src/app/api/patient");
const skip = new Set(["my-providers/route.ts", "buying-club/route.ts", "buying-club/drugs/search/route.ts", "prescriptions/[id]/pdf/route.ts"]);

function walk(dir, acc = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, acc);
    else if (ent.name === "route.ts") acc.push(p);
  }
  return acc;
}

const authBlockPatterns = [
  [
    /const session = await auth\(\);\r?\n\s*if \(!session\?\.user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\r?\n\s*if \(session\.user\.role !== "PATIENT"\)\r?\n\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);\r?\n/g,
    "ctx",
  ],
  [
    /const session = await auth\(\);\r?\n\s*if \(!session\?\.user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\r?\n\s*if \(session\.user\.role !== "PATIENT"\) \{\r?\n\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);\r?\n\s*\}\r?\n/g,
    "ctx",
  ],
  [
    /const session = await auth\(\);\r?\n\s*if \(!session\?\.user \|\| session\.user\.role !== "PATIENT"\) \{\r?\n\s*return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\r?\n\s*\}\r?\n/g,
    "ctx",
  ],
  [
    /const session = await auth\(\);\r?\n\s*if \(!session\?\.user \|\| session\.user\.role !== "PATIENT"\) \{\r?\n\s*return NextResponse\.json\(\{ error: "Forbidden" \}, \{ status: 403 \}\);\r?\n\s*\}\r?\n/g,
    "ctx",
  ],
  [
    /const session = await auth\(\);\r?\n\s*if \(!session\?\.user\) return NextResponse\.json\(\{ error: "Unauthorized" \}, \{ status: 401 \}\);\r?\n/g,
    "ctx",
  ],
  [
    /const session = await auth\(\);\r?\n\s*if \(!session\?\.user\) return new NextResponse\("Unauthorized", \{ status: 401 \}\);\r?\n/g,
    "ctxPdf",
  ],
];

const ctxBlock = `const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, patientProfileId, session } = ctx;
`;

const ctxPdfBlock = `const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId, session } = ctx;
`;

for (const file of walk(root)) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  if (skip.has(rel)) continue;
  let c = fs.readFileSync(file, "utf8");
  if (c.includes("requirePatient")) continue;
  if (!c.includes('@/lib/auth"')) {
    console.log("no auth import:", rel);
    continue;
  }

  c = c.replace(/import \{ auth \} from "@\/lib\/auth";\r?\n/, "");
  if (!c.includes("requirePatient")) {
    const firstImport = c.indexOf("import ");
    const end = c.indexOf("\n", firstImport);
    c = c.slice(0, end + 1) + 'import { requirePatient, isApiError } from "@/lib/api-auth";\n' + c.slice(end + 1);
  }

  let changed = false;
  for (const [re, kind] of authBlockPatterns) {
    const block = kind === "ctxPdf" ? ctxPdfBlock : ctxBlock;
    if (re.test(c)) {
      c = c.replace(re, block);
      changed = true;
    }
  }

  if (!changed) {
    console.log("no pattern:", rel);
    continue;
  }

  fs.writeFileSync(file, c);
  console.log("updated:", rel);
}
