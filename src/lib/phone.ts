const PHONE_BR = /^55(\d{2})(\d{4,5})(\d{4})$/;

/**
 * `5511912345678` → `(11) 91234-5678`; `551133334444` → `(11) 3333-4444`.
 * O número já vem validado pelo schema; a checagem aqui é a segunda trava.
 */
export function formatPhoneBR(digits: string): string {
  const match = PHONE_BR.exec(digits);
  if (!match || (digits.length !== 12 && digits.length !== 13)) {
    throw new Error(`Telefone inválido (use 55 + DDD, só números): ${JSON.stringify(digits)}`);
  }
  const [, ddd, start, end] = match;
  return `(${ddd}) ${start}-${end}`;
}
