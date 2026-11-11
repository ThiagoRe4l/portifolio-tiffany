import { describe, expect, it } from 'vitest';
import { resolveEntry } from './resolveEntry';

// RF-03: a entrada decide entre site e admin sem carregar roteador no site.

describe('resolveEntry', () => {
  it.each(['/admin', '/admin/', '/admin/login', '/admin/login/', '/admin/qualquer/coisa'])(
    '%s é admin',
    (pathname) => {
      expect(resolveEntry(pathname)).toEqual({ kind: 'admin' });
    },
  );

  it('"/" é o site, sem redirecionamento', () => {
    expect(resolveEntry('/')).toEqual({ kind: 'site' });
  });

  it.each(['/administrar', '/admins', '/qualquer-coisa', '/sobre/', '/index.html', ''])(
    '%j é o site e volta para "/"',
    (pathname) => {
      expect(resolveEntry(pathname)).toEqual({ kind: 'site', redirectTo: '/' });
    },
  );

  // Spec 003, T11: o link de recuperação pode voltar para a Site URL.
  describe('retorno do link de recuperação', () => {
    const TOKENS = '#access_token=aaa.bbb.ccc&refresh_token=rrr&type=recovery';
    const EXPIRED = '#error=access_denied&error_code=otp_expired';

    it.each([
      ['/', TOKENS],
      ['/qualquer-coisa', TOKENS],
      ['/', EXPIRED],
    ])('%s%s vai para a tela de nova senha, com o hash', (pathname, hash) => {
      expect(resolveEntry(pathname, hash)).toEqual({
        kind: 'recoveryRedirect',
        to: `/admin/nova-senha${hash}`,
      });
    });

    it('no admin, quem cuida do link é o próprio admin', () => {
      expect(resolveEntry('/admin', TOKENS)).toEqual({ kind: 'admin' });
    });

    it.each(['#contato', '#type=recovery', ''])('hash comum (%j) não muda nada', (hash) => {
      expect(resolveEntry('/', hash)).toEqual({ kind: 'site' });
    });
  });
});
