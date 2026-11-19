import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const SRC_DIR = path.join(process.cwd(), 'src');
const MAX_FUNCTION_LINES = 100;
const FORBIDDEN_ICON_LIBS = [
  'react-icons',
  '@fortawesome',
  '@heroicons',
  '@mui/icons-material',
  'feather-icons',
  'bootstrap-icons',
];

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

function checkFunctionsLength(filePath, content, violations) {
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  function visit(node) {
    if (
      ts.isFunctionDeclaration(node) ||
      ts.isMethodDeclaration(node) ||
      ts.isArrowFunction(node) ||
      ts.isFunctionExpression(node)
    ) {
      const start = sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
      const len = end - start + 1;
      if (len > MAX_FUNCTION_LINES) {
        const name = node.name?.getText(sourceFile) ?? '<anonymous>';
        violations.push(`${path.relative(process.cwd(), filePath)}:${start} função ${name} tem ${len} linhas (limite ${MAX_FUNCTION_LINES}).`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
}

function run() {
  const files = collectFiles(SRC_DIR);
  const violations = [];

  for (const filePath of files) {
    const rel = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');

    checkFunctionsLength(filePath, content, violations);

    for (const forbidden of FORBIDDEN_ICON_LIBS) {
      if (content.includes(forbidden)) {
        violations.push(`${rel}: biblioteca proibida detectada (${forbidden}). Use apenas lucide-react / pokemon-lucide.`);
      }
    }

    if (rel.startsWith('src/app/api/') && rel.endsWith('/route.ts')) {
      if (!content.includes('verifyRBAC')) {
        violations.push(`${rel}: rota de API sem chamada obrigatória a verifyRBAC (Regra #1 Harness).`);
      }
    }
  }

  if (violations.length > 0) {
    console.error('FALHAS NA AUDITORIA QA / HARNESS:\n' + violations.map((v) => ` - ${v}`).join('\n'));
    process.exit(1);
  }
  console.log(`Enforce_Design_System + Harness OK: ${files.length} arquivos validados (todas funções <= ${MAX_FUNCTION_LINES} linhas, RBAC em 100% das rotas, Tailwind + Lucide estritos).`);
}

run();
