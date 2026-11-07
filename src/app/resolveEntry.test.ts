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
});
