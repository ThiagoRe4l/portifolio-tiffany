import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearRecoveryLink, consumeRecoveryHash, getRecoveryLink } from './recoveryHash';

// Spec 003, T03 (D2, RF-07). O token não pode ficar na URL nem no histórico.

const PATH = '/admin/nova-senha';

function openAt(url: string) {
  window.history.replaceState(null, '', url);
}

afterEach(() => {
  clearRecoveryLink();
  openAt('/');
});

describe('consumeRecoveryHash', () => {
  it('link válido: guarda os tokens em memória', () => {
    openAt(`${PATH}#access_token=aaa.bbb.ccc&refresh_token=rrr&expires_in=3600&type=recovery`);

    consumeRecoveryHash();

    expect(getRecoveryLink()).toEqual({
      kind: 'tokens',
      accessToken: 'aaa.bbb.ccc',
      refreshToken: 'rrr',
    });
  });

  it('apaga o hash trocando a entrada do histórico, sem criar outra', () => {
    openAt(`${PATH}?x=1#access_token=aaa&refresh_token=rrr&type=recovery`);
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const pushState = vi.spyOn(window.history, 'pushState');
    const length = window.history.length;

    consumeRecoveryHash();

    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(pushState).not.toHaveBeenCalled();
    expect(window.history.length).toBe(length);
    expect(window.location.hash).toBe('');
    expect(window.location.pathname).toBe(PATH);
    expect(window.location.search).toBe('?x=1');
    expect(window.location.href).not.toContain('access_token');
  });

  // Spec 003, T11: a volta do link pode cair em outra rota do admin.
  it.each(['/admin', '/admin/login', '/admin/qualquer'])(
    'link em %s: vai para a tela de nova senha, sem o token',
    (path) => {
      openAt(`${path}?x=1#access_token=aaa&refresh_token=rrr&type=recovery`);

      consumeRecoveryHash();

      expect(window.location.pathname).toBe(PATH);
      expect(window.location.search).toBe('?x=1');
      expect(window.location.hash).toBe('');
      expect(getRecoveryLink()).toMatchObject({ kind: 'tokens' });
    },
  );

  it('link expirado em outra rota: também vai para a tela de nova senha', () => {
    openAt('/admin/login#error=access_denied&error_code=otp_expired');

    consumeRecoveryHash();

    expect(window.location.pathname).toBe(PATH);
    expect(getRecoveryLink()).toEqual({ kind: 'invalid' });
  });

  it('link expirado (#error_code): registra o erro e limpa a URL', () => {
    openAt(`${PATH}#error=access_denied&error_code=otp_expired&error_description=Link+expired`);

    consumeRecoveryHash();

    expect(getRecoveryLink()).toEqual({ kind: 'invalid' });
    expect(window.location.hash).toBe('');
  });

  it.each([
    ['outro tipo de link', 'access_token=aaa&refresh_token=rrr&type=magiclink'],
    ['sem tipo', 'access_token=aaa&refresh_token=rrr'],
    ['sem refresh_token', 'access_token=aaa&type=recovery'],
    ['access_token vazio', 'access_token=&refresh_token=rrr&type=recovery'],
  ])('%s: não vale como link, e o token sai da URL', (_name, hash) => {
    openAt(`${PATH}#${hash}`);

    consumeRecoveryHash();

    expect(getRecoveryLink()).toEqual({ kind: 'invalid' });
    expect(window.location.hash).toBe('');
  });

  it.each(['#secao', '#type=recovery', '#foo=bar'])('hash alheio (%s): não é tocado', (hash) => {
    openAt(`/admin${hash}`);
    const replaceState = vi.spyOn(window.history, 'replaceState');

    consumeRecoveryHash();

    expect(replaceState).not.toHaveBeenCalled();
    expect(window.location.hash).toBe(hash);
    expect(getRecoveryLink()).toBeNull();
  });

  it('sem hash: não há link', () => {
    openAt(PATH);

    consumeRecoveryHash();

    expect(getRecoveryLink()).toBeNull();
  });

  it('chamar de novo, já sem hash, não perde os tokens guardados', () => {
    openAt(`${PATH}#access_token=aaa&refresh_token=rrr&type=recovery`);

    consumeRecoveryHash();
    consumeRecoveryHash();

    expect(getRecoveryLink()).toMatchObject({ kind: 'tokens' });
  });

  it('clearRecoveryLink apaga os tokens da memória', () => {
    openAt(`${PATH}#access_token=aaa&refresh_token=rrr&type=recovery`);
    consumeRecoveryHash();

    clearRecoveryLink();

    expect(getRecoveryLink()).toBeNull();
  });
});
