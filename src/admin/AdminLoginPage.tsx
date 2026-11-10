import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { fetchInitials, signIn } from './auth/authApi';
import { AUTH_NOTICES, messageFor } from './auth/authMessages';
import { useAuth } from './auth/AuthProvider';
import { emailError } from './auth/validation';
import styles from './AdminLoginPage.module.css';
import { AdminIcon } from './components/AdminIcon';
import { AuthLayout } from './components/AuthLayout';
import { FormAlert } from './components/FormAlert';
import { PasswordField } from './components/PasswordField';
import { SubmitButton } from './components/SubmitButton';
import { TextField } from './components/TextField';

type FieldErrors = { email?: string | undefined; password?: string | undefined };

export function AdminLoginPage() {
  const { notice } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [initials, setInitials] = useState<string | null | undefined>(undefined);

  const submitting = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void fetchInitials().then((value) => {
      if (active) setInitials(value);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    // Lê do formulário: nem todo autopreenchimento dispara evento de digitação.
    const data = new FormData(event.currentTarget);
    const emailValue = String(data.get('email') ?? '');
    const passwordValue = String(data.get('password') ?? '');
    setEmail(emailValue);
    setPassword(passwordValue);

    const nextErrors: FieldErrors = {
      email: emailError(emailValue),
      password: passwordValue ? undefined : 'Informe sua senha.',
    };
    setErrors(nextErrors);
    setFormError(null);
    setNoticeDismissed(true);

    if (nextErrors.email) {
      emailRef.current?.focus();
      return;
    }
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }

    submitting.current = true;
    setBusy(true);
    const result = await signIn(emailValue, passwordValue);
    // Se deu certo, o AuthProvider assume e esta tela sai de cena ainda ocupada.
    if (!result.ok) {
      submitting.current = false;
      setBusy(false);
      setFormError(messageFor(result.kind));
    }
  }

  const alertMessage = formError ?? (notice && !noticeDismissed ? AUTH_NOTICES[notice] : null);

  return (
    <AuthLayout
      title="Área administrativa"
      subtitle="Entre para editar textos e fotos do site."
      initials={initials}
      note="Acesso exclusivo da administradora do site."
    >
      <FormAlert message={alertMessage} focus={Boolean(formError)} />
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
            setErrors((current) => ({ ...current, email: undefined }));
          }}
          error={errors.email}
        />
        <PasswordField
          ref={passwordRef}
          label="Senha"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          error={errors.password}
        />
        <SubmitButton busy={busy} busyLabel="Entrando…">
          <AdminIcon name="lock" size={18} />
          Entrar
        </SubmitButton>
        <Link className={styles.forgot} to="/admin/recuperar-senha">
          Esqueci minha senha
        </Link>
      </form>
    </AuthLayout>
  );
}
