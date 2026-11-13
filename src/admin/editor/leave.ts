/** Sai do admin com recarregamento (o site não faz parte do roteador). Separado para os testes. */
export function leaveTo(url: string): void {
  window.location.assign(url);
}
