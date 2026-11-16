import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../../../tests/setup/msw';
import { SUPABASE_URL } from '../../../../tests/support/supabaseAuth';
import { uploadPhoto, type UploadErrorKind } from './photoApi';
import type { PreparedPhoto } from './preparePhoto';

// Spec 005, T04 (D3; RF-09, RF-08). SDK de verdade; só a rede é simulada.

const UPLOAD_URL = `${SUPABASE_URL}/storage/v1/object/site-photos/fotos/:name`;
const PUBLIC_PREFIX = `${SUPABASE_URL}/storage/v1/object/public/site-photos/fotos/`;
const CODE = '3f6c2a1e-7b4d-4e2a-9c1f-0a1b2c3d4e5f';

type Received = {
  name: string;
  type: string | null;
  cache: string | null;
  upsert: string | null;
  size: number;
};
let received: Received[] = [];

function respond(response: (name: string) => Response | Promise<Response>) {
  server.use(
    http.post(UPLOAD_URL, async ({ request, params }) => {
      const name = String(params.name);
      received.push({
        name,
        type: request.headers.get('content-type'),
        cache: request.headers.get('cache-control'),
        upsert: request.headers.get('x-upsert'),
        size: (await request.arrayBuffer()).byteLength,
      });
      return response(name);
    }),
  );
}

const ok = (name: string) =>
  HttpResponse.json({
    Key: `site-photos/fotos/${name}`,
    Id: '00000000-0000-4000-8000-000000000000',
  });

function prepared(ext: 'webp' | 'jpg' = 'webp'): PreparedPhoto {
  const type = ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const blob = (bytes: number) => new Blob([new Uint8Array(bytes)], { type });
  return {
    width: 1600,
    height: 1200,
    ext,
    variants: [
      { width: 480, height: 360, blob: blob(10) },
      { width: 960, height: 720, blob: blob(20) },
      { width: 1600, height: 1200, blob: blob(30) },
    ],
  };
}

const storageError = (status: number, body: Record<string, unknown>) =>
  HttpResponse.json(body, { status });

beforeEach(() => {
  received = [];
});

describe('uploadPhoto', () => {
  it('envia as três versões com o nome gerado, o tipo, cache longo e sem sobrescrever', async () => {
    respond(ok);

    await uploadPhoto(prepared(), () => CODE);

    expect(received.map((item) => item.name).sort()).toEqual([
      `${CODE}-1600w.webp`,
      `${CODE}-480w.webp`,
      `${CODE}-960w.webp`,
    ]);
    for (const item of received) {
      expect(item.type).toBe('image/webp');
      expect(item.cache).toBe('max-age=31536000');
      expect(item.upsert).toBe('false');
    }
    expect(received.map((item) => item.size).sort((a, b) => a - b)).toEqual([10, 20, 30]);
  });

  it('em JPG, nomes e tipo de JPG', async () => {
    respond(ok);

    await uploadPhoto(prepared('jpg'), () => CODE);

    expect(received.every((item) => item.name.endsWith('.jpg') && item.type === 'image/jpeg')).toBe(
      true,
    );
  });

  it('devolve o endereço público da maior versão, com largura e altura', async () => {
    respond(ok);

    expect(await uploadPhoto(prepared(), () => CODE)).toEqual({
      ok: true,
      src: `${PUBLIC_PREFIX}${CODE}-1600w.webp`,
      width: 1600,
      height: 1200,
    });
  });

  it('sem gerador informado: um código aleatório por envio, nunca o nome original', async () => {
    respond(ok);

    await uploadPhoto(prepared());
    await uploadPhoto(prepared());

    const codes = new Set(received.map((item) => item.name.replace(/-\d+w\.webp$/, '')));
    expect(codes.size).toBe(2);
    for (const code of codes) expect(code).toMatch(/^[0-9a-f-]{36}$/);
  });

  it.each<[string, () => Response, UploadErrorKind]>([
    [
      'sessão vencida (401)',
      () => storageError(401, { statusCode: '401', message: 'x' }),
      'sessionExpired',
    ],
    [
      'token vencido (InvalidJWT)',
      () =>
        storageError(400, {
          statusCode: '400',
          error: 'InvalidJWT',
          message: '"exp" claim timestamp check failed',
        }),
      'sessionExpired',
    ],
    [
      'conta fora de admins (RLS)',
      () =>
        storageError(400, {
          statusCode: '403',
          error: 'Unauthorized',
          message: 'new row violates row-level security policy',
        }),
      'forbidden',
    ],
    [
      'arquivo grande demais',
      () => storageError(413, { statusCode: '413', message: 'x' }),
      'rejected',
    ],
    [
      'tipo não aceito pelo bucket',
      () => storageError(400, { statusCode: '415', error: 'invalid_mime_type', message: 'x' }),
      'rejected',
    ],
    ['erro 500', () => storageError(500, { statusCode: '500', message: 'x' }), 'unavailable'],
    ['sem rede', () => HttpResponse.error(), 'network'],
    [
      'outro erro',
      () => storageError(409, { statusCode: '409', error: 'Duplicate', message: 'x' }),
      'unknown',
    ],
  ])('%s: classificado, sem texto do servidor', async (_name, response, kind) => {
    respond(response);

    // toEqual exato: nenhum texto do servidor acompanha o resultado.
    expect(await uploadPhoto(prepared(), () => CODE)).toEqual({ ok: false, kind });
  });

  it('falha numa só versão: o envio todo falhou', async () => {
    respond((name) =>
      name.includes('-960w') ? storageError(500, { statusCode: '500' }) : ok(name),
    );

    expect(await uploadPhoto(prepared(), () => CODE)).toEqual({ ok: false, kind: 'unavailable' });
  });
});
