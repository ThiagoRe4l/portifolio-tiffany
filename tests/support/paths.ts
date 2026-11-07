import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// No ambiente jsdom, o `URL` global é o do jsdom; por isso resolvemos caminhos
// com `node:path` em vez de `new URL(relativo, import.meta.url)`.
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

/** Caminho absoluto a partir da raiz do repositório. */
export function fromRoot(...segments: string[]): string {
  return resolve(projectRoot, ...segments);
}
