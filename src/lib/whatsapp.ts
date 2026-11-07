/**
 * Link do WhatsApp (spec 001, RF-17): https://wa.me/<número>?text=<mensagem>.
 * O número já vem validado pelo schema (55 + DDD, só dígitos); a checagem aqui é
 * uma segunda trava. `encodeURIComponent` codifica espaço como %20 (nunca "+").
 */
export function buildWhatsAppLink(number: string, message: string): string {
  if (!/^\d+$/.test(number)) {
    throw new Error(`Número de WhatsApp inválido (use só dígitos): ${JSON.stringify(number)}`);
  }
  const base = `https://wa.me/${number}`;
  const text = message.trim();
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
