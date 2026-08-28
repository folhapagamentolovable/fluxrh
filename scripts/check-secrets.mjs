import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
const textFiles = files.filter(file => /\.(?:env|example|json|md|mjs|js|ts|tsx|sql|toml|ya?ml|ps1)$/i.test(file));
const rules = [
  { name: "Supabase secret key", pattern: /sb_secret_[A-Za-z0-9_-]{16,}/g },
  { name: "service_role JWT", pattern: /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/g },
  { name: "Postgres URL com senha", pattern: /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@<>]+@[^\s"']+/gi },
  { name: "service role configurada", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*["']?(?!your-|<|$)[^\s"']+/gi },
];

const findings = [];
for (const file of textFiles) {
  const content = readFileSync(file, "utf8");
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    if (rule.pattern.test(content)) findings.push(`${file}: ${rule.name}`);
  }
}

if (findings.length) {
  console.error(`Segredos potencialmente versionados:\n${findings.join("\n")}`);
  process.exit(1);
}
console.log(`Verificação concluída: ${textFiles.length} arquivos rastreados sem segredos privilegiados detectados.`);
