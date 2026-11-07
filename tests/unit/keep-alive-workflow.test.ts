// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// T12 — keep-alive do Supabase (spec 001, RF-19 / CA-19, parte local). O plano gratuito
// pausa o projeto sem uso; uma leitura semanal evita isso. A prova real só vem depois do
// push, com as variáveis cadastradas no GitHub. Leitura por texto, sem parser YAML.

const WORKFLOW = '.github/workflows/keep-supabase-alive.yml';

function readWorkflow(): string {
  return readFileSync(fromRoot(WORKFLOW), 'utf8').replace(/\r\n/g, '\n');
}

/** Linhas de comando dos passos `run:` (bloco `run: |` ou linha única). */
function runScripts(workflow: string): string {
  const blocks = [...workflow.matchAll(/^(\s+)run: \|\n((?:\1\s+.*\n?|\s*\n)*)/gm)].map(
    (match) => match[2] ?? '',
  );
  const inline = [...workflow.matchAll(/^\s+run: (?!\|)(.+)$/gm)].map((match) => match[1] ?? '');
  return [...blocks, ...inline].join('\n');
}

describe(`workflow ${WORKFLOW}`, () => {
  it('existe', () => {
    expect(existsSync(fromRoot(WORKFLOW))).toBe(true);
  });

  it('roda toda segunda às 09:00 UTC e também pode ser disparado à mão', () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/^on:\n(?:\s+.*\n)*?\s+schedule:\n\s+- cron: '0 9 \* \* 1'/m);
    expect(workflow).toMatch(/^on:\n(?:\s+.*\n)*?\s+workflow_dispatch:/m);
  });

  it('usa permissões mínimas e tem limite de tempo', () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/^permissions:\n\s+contents: read$/m);
    expect(workflow).toMatch(/timeout-minutes: \d+/);
  });

  it('usa só variáveis do repositório (chave pública), nunca segredos nem service_role', () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('vars.SUPABASE_URL');
    expect(workflow).toContain('vars.SUPABASE_ANON_KEY');
    expect(workflow).not.toMatch(/secrets\./);
    expect(workflow).not.toMatch(/service_role/i);
  });

  it('é pulado quando as variáveis ainda não foram cadastradas', () => {
    expect(readWorkflow()).toMatch(
      /if: \$\{\{ vars\.SUPABASE_URL != '' && vars\.SUPABASE_ANON_KEY != '' \}\}/,
    );
  });

  it('faz um curl --fail de leitura em site_content com o header apikey', () => {
    const scripts = runScripts(readWorkflow());

    expect(scripts).toMatch(/curl\b[^\n]*--fail/);
    expect(scripts).toContain('/rest/v1/site_content?select=section&limit=1');
    expect(scripts).toMatch(/apikey: \$SUPABASE_ANON_KEY/);
    expect(scripts).not.toMatch(/-X (POST|PATCH|PUT|DELETE)|--data|-d /);
  });

  it('passa as variáveis por env, sem interpolar ${{ }} dentro do comando', () => {
    const workflow = readWorkflow();

    expect(workflow).toMatch(/SUPABASE_URL: \$\{\{ vars\.SUPABASE_URL \}\}/);
    expect(workflow).toMatch(/SUPABASE_ANON_KEY: \$\{\{ vars\.SUPABASE_ANON_KEY \}\}/);
    expect(runScripts(workflow)).not.toContain('${{');
  });
});
