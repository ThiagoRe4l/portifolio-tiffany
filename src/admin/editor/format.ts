/** `10/11/2026 às 11:32`, no fuso do navegador (ou no informado, para os testes). */
export function formatPublished(iso: string, timeZone?: string): string {
  const date = new Date(iso);
  const zone = timeZone ? { timeZone } : {};
  const day = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...zone,
  }).format(date);
  const time = new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...zone,
  }).format(date);
  return `${day} às ${time}`;
}

/** A gravação mais recente entre as seções; `null` quando nenhuma foi gravada. */
export function latestUpdate(dates: readonly (string | null)[]): string | null {
  let latest: string | null = null;
  for (const date of dates) {
    if (date !== null && (latest === null || Date.parse(date) > Date.parse(latest))) latest = date;
  }
  return latest;
}
