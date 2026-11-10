import type { ReactNode } from 'react';

export type AdminIconName = 'arrowLeft' | 'eye' | 'eyeOff' | 'lock' | 'logout';

const EYE = (
  <>
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" />
  </>
);

const SHAPES: Record<AdminIconName, ReactNode> = {
  arrowLeft: <path d="M19 12H5M11 6l-6 6 6 6" />,
  eye: EYE,
  eyeOff: (
    <>
      {EYE}
      <path d="M4 4l16 16" />
    </>
  ),
  logout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
};

/** Ícones de linha do admin. Sempre decorativos: o nome fica no botão ou no link. */
export function AdminIcon({ name, size = 20 }: { name: AdminIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    >
      {SHAPES[name]}
    </svg>
  );
}
