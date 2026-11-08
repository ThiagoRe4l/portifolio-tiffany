/**
 * Textos montados a partir do conteúdo (declarados no teste "sem texto fixo").
 * O único texto que não vem do conteúdo é o separador " · ".
 */
export const CREDENTIAL_SEPARATOR = ' · ';

/** "Psicóloga · CRP 06/123456" (header e rodapé). */
export function credentialLine(profession: string, crp: string): string {
  return `${profession}${CREDENTIAL_SEPARATOR}${crp}`;
}

/** Número do passo pela posição (RF-09): '1' no mobile e '01' no desktop. */
export function stepNumbers(index: number): { short: string; padded: string } {
  const short = String(index + 1);
  return { short, padded: short.padStart(2, '0') };
}
