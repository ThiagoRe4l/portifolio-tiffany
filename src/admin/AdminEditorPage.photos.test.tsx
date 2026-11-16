import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultContent } from '@/content/defaults';
import { server } from '../../tests/setup/msw';
import {
  AUTH_URL,
  fakeSession,
  REST_URL,
  STORAGE_KEY,
  SUPABASE_URL,
  USER_ID,
} from '../../tests/support/supabaseAuth';
import { adminRoutes } from './adminRoutes';
import { AuthProvider } from './auth/AuthProvider';
import { preparePhoto } from './editor/photos/preparePhoto';

// Spec 005, T05 (CA-01, CA-05, CA-07, CA-08) no editor inteiro. A preparação é simulada
// (o jsdom não desenha imagens); o envio passa pelo SDK de verdade, com a rede simulada.

vi.mock('./editor/photos/preparePhoto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./editor/photos/preparePhoto')>()),
  preparePhoto: vi.fn(),
}));

const CONTENT_URL = `${REST_URL}/site_content`;
const UPLOAD_URL = `${SUPABASE_URL}/storage/v1/object/site-photos/fotos/:name`;
const PUBLIC = `${SUPABASE_URL}/storage/v1/object/public/site-photos/fotos/`;
const STAMP = '2026-11-10T14:32:05.123456+00:00';

let uploads: string[] = [];
let writes: Record<string, unknown>[] = [];

const blob = () => new Blob([new Uint8Array(8)], { type: 'image/webp' });

function respondUpload(response: (name: string) => Response | Promise<Response>) {
  server.use(
    http.post(UPLOAD_URL, async ({ params }) => {
      uploads.push(String(params.name));
      return response(String(params.name));
    }),
  );
}

function renderEditor(path = '/admin?secao=sobre') {
  const router = createMemoryRouter(adminRoutes, { initialEntries: [path] });
  render(
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>,
  );
  return router;
}

const photoGroup = () => screen.findByRole('group', { name: 'Foto' });
const fileInputIn = (group: HTMLElement) =>
  group.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
const jpg = () => new File([new Uint8Array(10)], 'IMG_0001.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  uploads = [];
  writes = [];
  vi.mocked(preparePhoto).mockResolvedValue({
    ok: true,
    photo: {
      width: 1600,
      height: 1200,
      ext: 'webp',
      variants: [480, 960, 1600].map((width) => ({ width, height: (width * 3) / 4, blob: blob() })),
    },
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fakeSession()));
  server.use(
    http.get(`${REST_URL}/admins`, () => HttpResponse.json([{ user_id: USER_ID }])),
    http.get(CONTENT_URL, () =>
      HttpResponse.json([{ section: 'sobre', data: defaultContent.sobre, updated_at: STAMP }]),
    ),
    http.patch(CONTENT_URL, async ({ request }) => {
      writes.push((await request.json()) as Record<string, unknown>);
      return HttpResponse.json([{ updated_at: STAMP }]);
    }),
    http.post(`${AUTH_URL}/logout`, () => new HttpResponse(null, { status: 204 })),
  );
  respondUpload((name) => HttpResponse.json({ Key: `site-photos/fotos/${name}` }));
});

afterEach(() => {
  localStorage.clear();
  vi.mocked(preparePhoto).mockReset();
});

describe('foto no editor', () => {
  it('enviar e publicar: o conteúdo grava o endereço da maior versão, com largura e altura', async () => {
    const user = userEvent.setup();
    renderEditor();
    const group = await photoGroup();

    await user.upload(fileInputIn(group), jpg());

    await waitFor(() => expect(uploads).toHaveLength(3));
    expect(await screen.findByText('Alterações não salvas')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Salvar e publicar' }));

    await waitFor(() => expect(writes).toHaveLength(1));
    const saved = (writes[0]?.data as typeof defaultContent.sobre).photo;
    const code = uploads[0]?.replace(/-\d+w\.webp$/, '');
    expect(saved).toEqual({
      src: `${PUBLIC}${code}-1600w.webp`,
      width: 1600,
      height: 1200,
      alt: defaultContent.sobre.photo.alt,
    });
  });

  it('durante o envio, "Salvar e publicar" e "Descartar" ficam indisponíveis', async () => {
    const user = userEvent.setup();
    respondUpload(async (name) => {
      await delay(80);
      return HttpResponse.json({ Key: `site-photos/fotos/${name}` });
    });
    renderEditor();
    await user.type(await screen.findByLabelText('Título'), '!');
    const group = await photoGroup();

    await user.upload(fileInputIn(group), jpg());

    expect(await within(group).findByText('Enviando foto…')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Salvar e publicar' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descartar' })).toBeDisabled();

    const progress = group.querySelector('[data-part="photo-progress"]');
    expect(progress).toHaveAttribute('role', 'status');
    await waitFor(() => expect(progress).toBeEmptyDOMElement());
    expect(screen.getByRole('button', { name: 'Salvar e publicar' })).toBeEnabled();
  });

  it('"Descartar" volta à foto anterior', async () => {
    const user = userEvent.setup();
    renderEditor();
    const group = await photoGroup();
    await user.upload(fileInputIn(group), jpg());
    await waitFor(() => expect(group.querySelector('img')).not.toBeNull());

    await user.click(screen.getByRole('button', { name: 'Descartar' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Descartar alterações?' })).getByRole('button', {
        name: 'Descartar',
      }),
    );

    expect((await photoGroup()).querySelector('img')).toBeNull();
    expect(screen.getByRole('button', { name: 'Enviar foto: Foto' })).toBeVisible();
  });

  it('falha no envio: mensagem junto da foto e nada muda no conteúdo', async () => {
    const user = userEvent.setup();
    respondUpload(() => HttpResponse.json({ statusCode: '500', message: 'x' }, { status: 500 }));
    renderEditor();
    const group = await photoGroup();

    await user.upload(fileInputIn(group), jpg());

    expect(await within(group).findByRole('alert')).toHaveTextContent(/Serviço indisponível/);
    expect(screen.getByRole('button', { name: 'Salvar e publicar' })).toBeDisabled();
  });

  it('sessão expirada no envio: volta ao login', async () => {
    const user = userEvent.setup();
    respondUpload(() =>
      HttpResponse.json(
        { statusCode: '400', error: 'InvalidJWT', message: '"exp" claim timestamp check failed' },
        { status: 400 },
      ),
    );
    const router = renderEditor();
    const group = await photoGroup();

    await user.upload(fileInputIn(group), jpg());

    await waitFor(() => expect(router.state.location.pathname).toBe('/admin/login'));
    expect(await screen.findByText(/Sua sessão expirou/)).toBeVisible();
  });
});
