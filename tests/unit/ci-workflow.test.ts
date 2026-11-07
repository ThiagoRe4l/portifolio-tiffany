// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// RF-13 / CA-13 (parte local): o workflow de CI roda todas as verificações.
// A prova definitiva (o workflow rodando e falhando com erro de lint) só vem
// com o primeiro push; este teste garante que ninguém remova uma etapa sem perceber.
// Leitura por texto, sem dependência de parser YAML.

const WORKFLOW = '.github/workflows/ci.yml';

function readWorkflow(): string {
  return readFileSync(fromRoot(WORKFLOW), 'utf8').replace(/\r\n/g, '\n');
}

/** Texto de um job: da linha `  nome:` até o próximo job (ou o fim). */
function jobBlock(workflow: string, name: string): string {
  const match = new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [\\w-]+:\\n|(?![\\s\\S]))`, 'm').exec(
    workflow,
  );
  return match?.[1] ?? '';
}

function expectInOrder(text: string, items: string[]): void {
  let last = -1;
  for (const item of items) {
    const index = text.indexOf(item, last + 1);
    expect(index, `"${item}" deveria aparecer depois do item anterior`).toBeGreaterThan(last);
    last = index;
  }
}

describe(`workflow de CI (${WORKFLOW})`, () => {
  it('existe', () => {
    expect(existsSync(fromRoot(WORKFLOW))).toBe(true);
  });

  it('roda em push e em pull request', () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/^on:\n(?:\s+.*\n)*?\s+push:/m);
    expect(workflow).toMatch(/^on:\n(?:\s+.*\n)*?\s+pull_request:/m);
  });

  it('usa permissões mínimas e nenhum segredo', () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/^permissions:\n\s+contents: read$/m);
    expect(workflow).not.toMatch(/secrets\./);
  });

  it('job quality: Node do .nvmrc, npm ci e todas as verificações em ordem', () => {
    const quality = jobBlock(readWorkflow(), 'quality');

    expect(quality).toMatch(/uses: actions\/setup-node@v\d+/);
    expect(quality).toMatch(/node-version-file: \.nvmrc/);
    expect(quality).toMatch(/cache: npm/);
    expectInOrder(quality, [
      'npm ci',
      'npm run lint',
      'npm run format:check',
      'npm run typecheck',
      'npm run test',
      'npm run build',
      'npm run size',
    ]);
  });

  it('job e2e: depois do quality, com Chromium e WebKit, e relatório quando falha', () => {
    const e2e = jobBlock(readWorkflow(), 'e2e');

    expect(e2e).toMatch(/needs: quality/);
    expect(e2e).toMatch(/node-version-file: \.nvmrc/);
    expectInOrder(e2e, [
      'npm ci',
      'npx playwright install --with-deps chromium webkit',
      'npm run test:e2e',
    ]);
    expect(e2e).toMatch(/uses: actions\/upload-artifact@v\d+/);
    expect(e2e).toMatch(/if: failure\(\)/);
    expect(e2e).toMatch(/path: playwright-report/);
  });
});
