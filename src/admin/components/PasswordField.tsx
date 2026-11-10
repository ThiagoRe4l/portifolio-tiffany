import { useState, type ComponentProps } from 'react';
import { AdminIcon } from './AdminIcon';
import styles from './PasswordField.module.css';
import { TextField } from './TextField';

type PasswordFieldProps = Omit<
  ComponentProps<typeof TextField>,
  'type' | 'trailing' | 'autoComplete'
> & {
  autoComplete: 'current-password' | 'new-password';
};

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      // Visível, o campo vira texto comum: sem isso o celular altera a senha digitada.
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          className={styles.toggle}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setVisible((current) => !current)}
        >
          <AdminIcon name={visible ? 'eyeOff' : 'eye'} />
        </button>
      }
    />
  );
}
