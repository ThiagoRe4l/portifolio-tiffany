const MIN_PASSWORD_LENGTH = 8;

/** Confere só o formato; quem decide se a conta existe é o servidor. */
export function emailError(email: string): string | undefined {
  if (!email.trim()) return 'Informe seu e-mail.';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? undefined : 'Informe um e-mail válido.';
}

export function newPasswordErrors(
  password: string,
  confirmation: string,
): { password: string | undefined; confirmation: string | undefined } {
  let passwordError: string | undefined;
  if (!password) passwordError = 'Informe a nova senha.';
  else if (password.length < MIN_PASSWORD_LENGTH) {
    passwordError = `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  }

  let confirmationError: string | undefined;
  if (!confirmation) confirmationError = 'Confirme a nova senha.';
  else if (!passwordError && confirmation !== password) {
    confirmationError = 'As senhas não são iguais.';
  }

  return { password: passwordError, confirmation: confirmationError };
}
