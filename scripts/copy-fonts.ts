/**
 * Copia as fontes usadas pelo site de node_modules (Fontsource) para public/fonts/.
 * Rode com `npm run fonts:copy` ao atualizar os pacotes de fonte.
 * Só os arquivos WOFF2 do subconjunto latino entram no site.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(root, 'public/fonts');

const FONTS = [
  {
    name: 'Inter',
    packageDir: 'node_modules/@fontsource-variable/inter',
    file: 'inter-latin-wght-normal.woff2',
  },
  {
    name: 'Fraunces',
    packageDir: 'node_modules/@fontsource/fraunces',
    file: 'fraunces-latin-500-normal.woff2',
  },
];

mkdirSync(outputDir, { recursive: true });

const licenses: string[] = [];
for (const font of FONTS) {
  copyFileSync(resolve(root, font.packageDir, 'files', font.file), resolve(outputDir, font.file));
  const license = readFileSync(resolve(root, font.packageDir, 'LICENSE'), 'utf8').trim();
  licenses.push(`=== ${font.name} (${font.file}) ===\n\n${license}\n`);
  console.log(`copiado: public/fonts/${font.file}`);
}

writeFileSync(resolve(outputDir, 'LICENSE-OFL.txt'), licenses.join('\n'));
console.log('copiado: public/fonts/LICENSE-OFL.txt');
