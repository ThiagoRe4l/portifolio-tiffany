/**
 * Destinos dos botões de contato (spec 002, RF-14). O WhatsApp fica em whatsapp.ts.
 * Os valores já vêm validados pelo schema; as checagens aqui são a segunda trava.
 */

const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const EMAIL = /^[^\s@?&#]+@[^\s@?&#]+\.[^\s@?&#]+$/;
const DIGITS = /^\d{10,15}$/;

export function instagramUrl(handle: string): string {
  if (!INSTAGRAM_HANDLE.test(handle)) {
    throw new Error(`Usuário do Instagram inválido: ${JSON.stringify(handle)}`);
  }
  return `https://www.instagram.com/${handle}`;
}

export function mailtoUrl(address: string): string {
  if (!EMAIL.test(address)) throw new Error(`E-mail inválido: ${JSON.stringify(address)}`);
  return `mailto:${address}`;
}

export function telUrl(number: string): string {
  if (!DIGITS.test(number)) throw new Error(`Telefone inválido: ${JSON.stringify(number)}`);
  return `tel:+${number}`;
}
