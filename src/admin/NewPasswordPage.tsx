import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import styles from './AdminLoginPage.module.css';
import { establishRecoverySessionOnce, updatePassword } from './auth/authApi';
import { messageFor } from './auth/authMessages';
import screenStyles from './auth/AuthScreens.module.css';
import { clearRecoveryLink, getRecoveryLink } from './auth/recoveryHash';
import { newPasswordErrors } from './auth/validation';
import { AuthLayout } from './components/AuthLayout';
import { FormAlert } from './components/FormAlert';
import { PasswordField } from './components/PasswordField';
import { SubmitButton } from './components/SubmitButton';
import buttonStyles from './components/SubmitButton.module.css';

type Phase = 'verifying' | 'linkFailed' | 'ready' | 'saved' | 'expired';

/** Tempo para ler a confirmação antes de abrir o painel. */
const SAVED_REDIRECT_MS = 1500;

export function NewPasswordPage() {
  const navigate = useNavigate();
  const [link] = useState(getRecoveryLink);
  const tokens = link?.kind === 'tokens' ? link : null;
  const [phase, setPhase] = useState<Phase>(tokens ? 'verifying' : 'expired');
  const [linkError, setLinkError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!tokens) return;
    let active = true;
    void establishRecoverySessionOnce(tokens).then((result) => {
      if (!active) return;
      if (result.ok) {
        clearRecoveryLink();
        setPhase('ready');
      } else if (result.kind === 'expiredLink') {
        setPhase('expired');
      } else {
        setLinkError(messageFor(result.kind));
        setPhase('linkFailed');
      }
    });
    return () => {
      active = false;
    };
  }, [tokens, attempt]);

  useEffect(() => {
    if (phase !== 'saved') return;
    const timer = setTimeout(() => void navigate('/admin', { replace: true }), SAVED_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [phase, navigate]);

  return (
    <AuthLayout
      title="Criar nova senha"
      subtitle={phase === 'ready' ? 'Escolha uma senha com pelo menos 8 caracteres.' : undefined}
      initials={null}
    >
      {phase === 'verifying' ? (
        <div className={screenStyles.message}>
          <p role="status">Verificando o link…</p>
        </div>
      ) : null}

      {phase === 'linkFailed' ? (
        <div className={screenStyles.message}>
          <FormAlert message={linkError} focus={false} />
          <button
            type="button"
            className={buttonStyles.button}
            onClick={() => {
              setPhase('verifying');
              setAttempt((current) => current + 1);
            }}
          >
            Tentar novamente
          </button>
        </div>
      ) : null}

      {phase === 'expired' ? (
        <div className={screenStyles.message}>
          <FormAlert message={messageFor('expiredLink')} focus={false} />
          <Link className={styles.forgot} to="/admin/recuperar-senha">
            Pedir novo link
          </Link>
        </div>
      ) : null}

      {phase === 'saved' ? (
        <div className={screenStyles.message}>
          <p role="status">Senha criada com sucesso. Abrindo o painel…</p>
        </div>
      ) : null}

      {phase === 'ready' ? (
        <NewPasswordForm onSaved={() => setPhase('saved')} onExpired={() => setPhase('expired')} />
      ) : null}
    </AuthLayout>
  );
}

function NewPasswordForm({ onSaved, onExpired }: { onSaved: () => void; onExpired: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [errors, setErrors] = useState<ReturnType<typeof newPasswordErrors>>({
    password: undefined,
    confirmation: undefined,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submitting = useRef(false);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    const nextErrors = newPasswordErrors(password, confirmation);
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.password) {
      passwordRef.current?.focus();
      return;
    }
    if (nextErrors.confirmation) {
      confirmationRef.current?.focus();
      return;
    }

    submitting.current = true;
    setBusy(true);
    const result = await updatePassword(password);
    submitting.current = false;
    setBusy(false);

    if (result.ok) onSaved();
    else if (result.kind === 'expiredLink') onExpired();
    else setFormError(messageFor(result.kind));
  }

  return (
    <>
      <FormAlert message={formError} />
      <form className={styles.form} noValidate onSubmit={(event) => void handleSubmit(event)}>
        <PasswordField
          ref={passwordRef}
          label="Nova senha"
          name="new-password"
          autoComplete="new-password"
          value={password}
          onChange={(value) => {
            setPassword(value);
            setErrors((current) => ({ ...current, password: undefined }));
          }}
          error={errors.password}
        />
        <PasswordField
          ref={confirmationRef}
          label="Confirmar nova senha"
          name="confirm-password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(value) => {
            setConfirmation(value);
            setErrors((current) => ({ ...current, confirmation: undefined }));
          }}
          error={errors.confirmation}
        />
        <SubmitButton busy={busy} busyLabel="Salvando…">
          Salvar nova senha
        </SubmitButton>
      </form>
    </>
  );
}
