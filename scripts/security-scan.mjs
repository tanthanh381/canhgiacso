import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)
  .filter((file) => !file.startsWith('docs/') && !file.endsWith('.lock'));

const rules = [
  { name: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
  { name: 'GitHub token', regex: /\b(?:gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/ },
  { name: 'OpenAI secret key', regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/ },
  { name: 'Supabase secret key', regex: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/ },
  { name: 'AWS access key', regex: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/ },
  { name: 'service-role credential assignment', regex: /(?:service[_-]?role|SUPABASE_SERVICE_ROLE_KEY)\s*[:=]\s*["'`][^"'`\n]{20,}/i },
  { name: 'database URL with password', regex: /postgres(?:ql)?:\/\/[^\s:@]+:[^\s@]+@/i },
];

const findings = [];
for (const file of files) {
  let source;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    continue;
  }

  for (const rule of rules) {
    if (rule.regex.test(source)) findings.push(`${file}: possible ${rule.name}`);
  }
}

if (findings.length) {
  console.error('High-confidence secret scan failed:');
  for (const finding of findings) console.error(`- ${finding}`);
  console.error('Rotate any real exposed credential before removing the finding.');
  process.exit(1);
}

console.log(`Secret scan passed (${files.length} tracked files checked).`);
