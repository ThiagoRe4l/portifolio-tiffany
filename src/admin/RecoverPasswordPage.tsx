import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import styles from './AdminLoginPage.module.css';
import { requestPasswordReset } from './auth/authApi';
import { AUTH_NOTICES, messageFor } from './auth/authMessages';
import screenStyles from './auth/AuthScreens.module.css';
import { emailError } from './auth/validation';
import { AuthLayout } from './components/AuthLayout';
import { FormAlert } from './components/FormAlert';
import { SubmitButton } from './components/SubmitButton';
import { TextField } from './components/TextField';

export function RecoverPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>(undefined);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submitting = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    const nextError = emailError(email);
    setError(nextError);
    setFormError(null);
    if (nextError) {
      emailRef.current?.focus();
      return;
    }

    submitting.current = true;
    setBusy(true);
    const result = await requestPasswordReset(email);
    submitting.current = false;
    setBusy(false);
    if (result.ok) setSent(true);
    else setFormError(messageFor(result.kind));
  }

  const backToLogin = (
    <Link className={styles.forgot} to="/admin/login">
      Voltar ao login
    </Link>
  );

  return (
    <AuthLayout
      title="Recuperar senha"
      subtitle="Informe seu e-mail para receber o link de criação de uma nova senha."
      initials={null}
    >
      {sent ? (
        <div className={screenStyles.message}>
          <p role="status">{AUTH_NOTICES.recoverySent}</p>
          {backToLogin}
        </div>
      ) : (
        <>
          <FormAlert message={formError} />
          <form className={styles.form} noValidate onSubmit={(event) => void handleSubmit(event)}>
            <TextField
              ref={emailRef}
              label="E-mail"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(value) => {
                setEmail(value);
                setError(undefined);
              }}
              error={error}
            />
            <SubmitButton busy={busy} busyLabel="Enviando…">
              Enviar link
            </SubmitButton>
            {backToLogin}
          </form>
        </>
      )}
    </AuthLayout>
  );
}
