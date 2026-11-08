// @vitest-environment node
import { ESLint } from 'eslint';
import { beforeAll, describe, expect, it } from 'vitest';
import { fromRoot } from '../support/paths';

// CA-06: as regras de lint que protegem o conteúdo editável e a acessibilidade.
// Os trechos são analisados em memória (lintText) com caminhos fictícios,
// para não deixar arquivos "ruins" no repositório.

let eslint: ESLint;

beforeAll(async () => {
  eslint = new ESLint({ cwd: fromRoot() });
  // A primeira análise carrega a config e os plugins (alguns segundos).
  await eslint.lintText('export {};\n', { filePath: fromRoot('src/lib/warmup.ts') });
}, 60_000);

async function lint(filePath: string, code: string) {
  const [result] = await eslint.lintText(code, { filePath: fromRoot(filePath) });
  if (!result) throw new Error('ESLint não retornou resultado');
  return result.messages;
}

async function ruleIds(filePath: string, code: string): Promise<(string | null)[]> {
  return (await lint(filePath, code)).map((message) => message.ruleId);
}

const LITERAL_TEXT = `
export function Example() {
  return <p>Olá, eu sou a psicóloga.</p>;
}
`;

const DANGEROUS_HTML = `
export function Example({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
`;

describe('texto fixo no site (react/jsx-no-literals)', () => {
  it('bloqueia texto literal em JSX dentro de src/site', async () => {
    expect(await ruleIds('src/site/Example.tsx', LITERAL_TEXT)).toContain('react/jsx-no-literals');
  });

  it('permite texto literal no admin', async () => {
    expect(await ruleIds('src/admin/Example.tsx', LITERAL_TEXT)).not.toContain(
      'react/jsx-no-literals',
    );
  });

  it('bloqueia texto fixo em atributos visíveis ou lidos por leitor de tela', async () => {
    const code = `
export function Example({ src }: { src: string }) {
  return (
    <>
      <button type="button" aria-label="Abrir menu" />
      <img src={src} alt="Foto do consultório" />
    </>
  );
}
`;
    const messages = await lint('src/site/Example.tsx', code);
    const literalErrors = messages.filter((m) => m.ruleId === 'react/jsx-no-literals');

    expect(literalErrors).toHaveLength(2);
  });

  it('permite valores técnicos de atributos e texto vindo do conteúdo', async () => {
    const code = `
const a11yLabels = { openMenu: 'Abrir menu' } as const;

export function Example({ title, url, src, alt }: { title: string; url: string; src: string; alt: string }) {
  return (
    <section>
      <h2>{title}</h2>
      <a href={url} target="_blank" rel="noopener noreferrer">{title}</a>{' '}
      <button type="button" aria-label={a11yLabels.openMenu} />
      <img src={src} alt={alt} loading="lazy" decoding="async" fetchPriority="high" width={400} height={300} />
    </section>
  );
}
`;
    expect(await lint('src/site/Example.tsx', code)).toEqual([]);
  });
});

// Spec 002 (plan D8): valores técnicos do site público e SVG com geometria em variáveis.
describe('site público (spec 002)', () => {
  it('permite role="img" e referrerPolicy do mapa', async () => {
    const code = `
export function Example({ alt, src, title }: { alt: string; src: string; title: string }) {
  return (
    <section>
      <div role="img" aria-label={alt} />
      <iframe src={src} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
    </section>
  );
}
`;
    expect(await lint('src/site/Example.tsx', code)).toEqual([]);
  });

  it('permite SVG com a geometria vinda de variáveis (icons/paths.ts)', async () => {
    const code = `
const VIEW_BOX = '0 0 24 24';
const PATH = 'M4 7h16M4 12h16M4 17h16';

export function Example() {
  return (
    <svg viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
      <path d={PATH} />
    </svg>
  );
}
`;
    expect(await lint('src/site/Example.tsx', code)).toEqual([]);
  });

  it('testes de componentes em src/site podem usar textos de exemplo', async () => {
    expect(await ruleIds('src/site/components/Example.test.tsx', LITERAL_TEXT)).not.toContain(
      'react/jsx-no-literals',
    );
    expect(await ruleIds('src/site/components/Example.tsx', LITERAL_TEXT)).toContain(
      'react/jsx-no-literals',
    );
  });

  it('continua barrando geometria e textos escritos direto no JSX', async () => {
    const code = `
export function Example() {
  return (
    <svg viewBox="0 0 24 24" aria-label="Ícone de menu">
      <path d="M4 7h16" />
    </svg>
  );
}
`;
    const literalErrors = (await lint('src/site/Example.tsx', code)).filter(
      (message) => message.ruleId === 'react/jsx-no-literals',
    );

    expect(literalErrors).toHaveLength(3);
  });
});

describe('HTML bruto proibido (react/no-danger)', () => {
  it.each(['src/site/Example.tsx', 'src/admin/Example.tsx', 'src/lib/Example.tsx'])(
    'bloqueia dangerouslySetInnerHTML em %s',
    async (filePath) => {
      expect(await ruleIds(filePath, DANGEROUS_HTML)).toContain('react/no-danger');
    },
  );
});

describe('regras gerais', () => {
  it('acessibilidade: imagem sem texto alternativo (jsx-a11y/alt-text)', async () => {
    const code = `
export function Example({ src }: { src: string }) {
  return <img src={src} />;
}
`;
    expect(await ruleIds('src/admin/Example.tsx', code)).toContain('jsx-a11y/alt-text');
  });

  it('hooks: hook chamado dentro de condição (react-hooks/rules-of-hooks)', async () => {
    const code = `
import { useState } from 'react';

export function Example({ open }: { open: boolean }) {
  if (open) {
    useState(0);
  }
  return null;
}
`;
    expect(await ruleIds('src/admin/Example.tsx', code)).toContain('react-hooks/rules-of-hooks');
  });

  it('TypeScript: any explícito (@typescript-eslint/no-explicit-any)', async () => {
    const code = `export const value: any = 1;\n`;

    expect(await ruleIds('src/lib/example.ts', code)).toContain(
      '@typescript-eslint/no-explicit-any',
    );
  });
});

describe('repositório', () => {
  it('o código atual passa no lint sem erros nem avisos', async () => {
    const results = await eslint.lintFiles(['.']);
    const problems = results.flatMap((result) =>
      result.messages.map(
        (m) => `${result.filePath}:${m.line}:${m.column} ${m.ruleId ?? ''} ${m.message}`,
      ),
    );

    expect(problems).toEqual([]);
  }, 60_000);
});
