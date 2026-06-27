#!/usr/bin/env node
import fs from "node:fs";

const files = [
  "src/lib/professional-landing-content.ts",
  "src/app/(auth)/register/professional/page.tsx",
  "src/app/(auth)/register/professional/[slug]/page.tsx",
];

const replacements = [
  // Spanish: Portuguese "m?s" used instead of Spanish "m?s"
  ["datos m\u00eas sensibles", "datos m\u00e1s sensibles"],
  ["quien m\u00eas lo necesita", "quien m\u00e1s lo necesita"],
  ["quien m\u00eas sufre", "quien m\u00e1s sufre"],
  // Spanish typos
  ["Historial con historial completo", "Historial cl\u00ednico completo"],
  ["Historial nutricional con antropometr\u00eda e historial", "Historial nutricional con antropometr\u00eda y seguimiento"],
  // Comment
  ["// English ? abbreviated", "// English \u2014 abbreviated"],
  // Page metadata (professional landing)
  [
    'title: "Doctor8 ? Plataforma para Profissionais de Sa?de"',
    'title: "Doctor8 \u2014 Plataforma para Profissionais de Sa\u00fade"',
  ],
  [
    '"Agenda, teleconsulta, prontu?rio, prescri??es digitais e pagamentos ? tudo em um lugar. Para m?dicos e profissionais de sa?de no Brasil, EUA e Europa."',
    '"Agenda, teleconsulta, prontu\u00e1rio, prescri\u00e7\u00f5es digitais e pagamentos \u2014 tudo em um lugar. Para m\u00e9dicos e profissionais de sa\u00fade no Brasil, EUA e Europa."',
  ],
  ["`${prof.title} ? Doctor8 Profissionais`", "`${prof.title} \u2014 Doctor8 Profissionais`"],
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let s = fs.readFileSync(file, "utf8");
  let changed = 0;
  for (const [from, to] of replacements) {
    const n = s.split(from).length - 1;
    if (n > 0) {
      s = s.split(from).join(to);
      changed += n;
      console.log(`${file}: ${JSON.stringify(from.slice(0, 50))} -> (${n}x)`);
    }
  }
  if (changed) fs.writeFileSync(file, s, "utf8");
}

console.log("Done.");
