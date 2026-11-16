import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { photo as photoField } from '@/content/fields';
import type { Photo } from '@/content/types';
import { uploadPhoto, type UploadResult } from '../photos/photoApi';
import { preparePhoto, type PrepareResult } from '../photos/preparePhoto';
import { buildTree } from '../schemaTree';
import { PhotoField } from './PhotoField';

// Spec 005, T05 (D4; RF-01, RF-05 a RF-08; CA-01, CA-02, CA-05 a CA-07).
// Preparação e envio simulados aqui; o editor inteiro, com o SDK, em
// AdminEditorPage.photos.test.tsx; a foto real, no E2E.

vi.mock('../photos/preparePhoto', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../photos/preparePhoto')>()),
  preparePhoto: vi.fn(),
}));
vi.mock('../photos/photoApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../photos/photoApi')>()),
  uploadPhoto: vi.fn(),
}));

const NODE = buildTree(photoField('Foto principal'), 'photo', 'photo');
const OLD: Photo = {
  src: 'https://exemplo.test/fotos/antiga-1600w.webp',
  width: 1600,
  height: 1200,
  alt: 'Sala de atendimento',
};
const NEW_SRC = 'https://exemplo.test/fotos/nova-1200w.webp';
const PREPARED: PrepareResult = {
  ok: true,
  photo: { width: 1200, height: 1600, ext: 'webp', variants: [] },
};

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function Harness({
  initial = OLD,
  onBusyChange = vi.fn(),
  onSessionExpired = vi.fn(),
  spy = vi.fn(),
}: {
  initial?: Photo;
  onBusyChange?: (busy: boolean) => void;
  onSessionExpired?: () => void;
  spy?: (photo: Photo) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <PhotoField
        node={NODE}
        path={['photo']}
        value={value}
        onChange={(next) => {
          spy(next as Photo);
          setValue(next as Photo);
        }}
        onBusyChange={onBusyChange}
        onSessionExpired={onSessionExpired}
      />
      <button type="button" onClick={() => setValue(initial)}>
        voltar ao salvo
      </button>
    </>
  );
}

const fileInput = () =>
  document.querySelector<HTMLInputElement>('input[type="file"]') as HTMLInputElement;
const progress = () =>
  document.querySelector<HTMLElement>('[data-part="photo-progress"]') as HTMLElement;
const jpg = () => new File([new Uint8Array(10)], 'IMG_0001.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  vi.mocked(preparePhoto).mockResolvedValue(PREPARED);
  vi.mocked(uploadPhoto).mockResolvedValue({ ok: true, src: NEW_SRC, width: 1200, height: 1600 });
});

afterEach(() => {
  vi.mocked(preparePhoto).mockReset();
  vi.mocked(uploadPhoto).mockReset();
});

describe('botão e campo de arquivo (RF-01, RF-02)', () => {
  it('"Trocar foto" quando há foto, com o nome do campo', () => {
    render(<Harness />);

    expect(screen.getByRole('button', { name: 'Trocar foto: Foto principal' })).toBeVisible();
  });

  it('"Enviar foto" quando ainda não há foto', () => {
    render(<Harness initial={{ ...OLD, src: '' }} />);

    expect(screen.getByRole('button', { name: 'Enviar foto: Foto principal' })).toBeVisible();
  });

  it('o arquivo aceita só JPG, PNG e WebP (o iPhone converte HEIC) e fica fora do Tab', () => {
    render(<Harness />);

    expect(fileInput()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
    expect(fileInput()).toHaveAttribute('tabindex', '-1');
    expect(fileInput()).toHaveAttribute('aria-hidden', 'true');
  });

  it('o botão abre a escolha de arquivo', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const click = vi.spyOn(fileInput(), 'click');

    await user.click(screen.getByRole('button', { name: /Trocar foto/ }));

    expect(click).toHaveBeenCalledTimes(1);
  });

  it('miniatura: a versão de 480 px, quando o endereço segue a regra', () => {
    render(<Harness />);

    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      'https://exemplo.test/fotos/antiga-480w.webp',
    );
  });
});

describe('preparar e enviar (RF-05, RF-06; CA-01, CA-05)', () => {
  it('anuncia cada etapa, avisa o editor e troca a foto mantendo o texto alternativo', async () => {
    const user = userEvent.setup();
    const prepare = deferred<PrepareResult>();
    const upload = deferred<UploadResult>();
    vi.mocked(preparePhoto).mockReturnValue(prepare.promise);
    vi.mocked(uploadPhoto).mockReturnValue(upload.promise);
    const onBusyChange = vi.fn();
    const spy = vi.fn();
    render(<Harness onBusyChange={onBusyChange} spy={spy} />);
    const photo = jpg();

    await user.upload(fileInput(), photo);

    expect(preparePhoto).toHaveBeenCalledExactlyOnceWith(photo);
    expect(progress()).toHaveTextContent('Preparando a foto…');
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    const button = screen.getByRole('button', { name: /Trocar foto/ });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');

    await act(async () => prepare.resolve(PREPARED));
    expect(uploadPhoto).toHaveBeenCalledExactlyOnceWith(PREPARED.ok ? PREPARED.photo : null);
    expect(progress()).toHaveTextContent('Enviando foto…');

    await act(async () => upload.resolve({ ok: true, src: NEW_SRC, width: 1200, height: 1600 }));

    expect(spy).toHaveBeenCalledExactlyOnceWith({
      ...OLD,
      src: NEW_SRC,
      width: 1200,
      height: 1600,
    });
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    expect(progress()).toBeEmptyDOMElement();
    expect(button).toBeEnabled();
    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      'https://exemplo.test/fotos/nova-480w.webp',
    );
  });

  it('escolher o mesmo arquivo de novo também funciona', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.upload(fileInput(), jpg());
    await screen.findByText('Confira se o texto alternativo descreve a foto nova.');
    await user.upload(fileInput(), jpg());

    await vi.waitFor(() => expect(preparePhoto).toHaveBeenCalledTimes(2));
  });
});

describe('texto alternativo (RF-07; CA-06)', () => {
  it('depois da troca, pede para conferir o texto; editar o texto tira o aviso', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.upload(fileInput(), jpg());
    const alt = screen.getByLabelText('Texto alternativo');
    await vi.waitFor(() =>
      expect(alt).toHaveAccessibleDescription(
        /Confira se o texto alternativo descreve a foto nova\./,
      ),
    );

    await user.type(alt, ' clara');

    expect(alt).not.toHaveAccessibleDescription(/Confira se o texto alternativo/);
  });

  it('voltar à foto anterior (Descartar) tira o aviso', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.upload(fileInput(), jpg());
    await screen.findByText('Confira se o texto alternativo descreve a foto nova.');

    await user.click(screen.getByRole('button', { name: 'voltar ao salvo' }));

    expect(screen.queryByText('Confira se o texto alternativo descreve a foto nova.')).toBeNull();
    expect(document.querySelector('img')).toHaveAttribute(
      'src',
      'https://exemplo.test/fotos/antiga-480w.webp',
    );
  });
});

describe('falhas (RF-02, RF-03, RF-08; CA-02, CA-07)', () => {
  it.each<[string, PrepareResult, string]>([
    ['tipo não aceito', { ok: false, kind: 'type' }, 'Use uma foto em JPG, PNG ou WebP.'],
    [
      'grande demais',
      { ok: false, kind: 'tooLarge' },
      'Esta foto é grande demais (máximo de 20 MB).',
    ],
    [
      'não abre',
      { ok: false, kind: 'unreadable' },
      'Não foi possível preparar esta foto. Tente outra ou uma versão menor.',
    ],
  ])(
    '%s: mensagem junto do campo, nada enviado, foto anterior mantida',
    async (_n, result, text) => {
      const user = userEvent.setup();
      vi.mocked(preparePhoto).mockResolvedValue(result);
      const spy = vi.fn();
      const onBusyChange = vi.fn();
      render(<Harness spy={spy} onBusyChange={onBusyChange} />);

      await user.upload(fileInput(), jpg());

      expect(await screen.findByRole('alert')).toHaveTextContent(text);
      expect(onBusyChange).toHaveBeenLastCalledWith(false);
      expect(uploadPhoto).not.toHaveBeenCalled();
      expect(spy).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Trocar foto/ })).toBeEnabled();
    },
  );

  it('falha no envio: mensagem, foto anterior mantida e dá para tentar de novo', async () => {
    const user = userEvent.setup();
    vi.mocked(uploadPhoto).mockResolvedValueOnce({ ok: false, kind: 'network' });
    const spy = vi.fn();
    const onBusyChange = vi.fn();
    render(<Harness spy={spy} onBusyChange={onBusyChange} />);

    await user.upload(fileInput(), jpg());

    expect(await screen.findByRole('alert')).toHaveTextContent(/Sem conexão com a internet/);
    expect(spy).not.toHaveBeenCalled();
    expect(onBusyChange).toHaveBeenLastCalledWith(false);

    await user.upload(fileInput(), jpg());

    await vi.waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('sessão expirada no envio: avisa o editor, que leva ao login', async () => {
    const user = userEvent.setup();
    vi.mocked(uploadPhoto).mockResolvedValue({ ok: false, kind: 'sessionExpired' });
    const onSessionExpired = vi.fn();
    render(<Harness onSessionExpired={onSessionExpired} />);

    await user.upload(fileInput(), jpg());

    await vi.waitFor(() => expect(onSessionExpired).toHaveBeenCalledTimes(1));
  });

  it('saiu da seção no meio do envio: não altera nada e libera o editor', async () => {
    const user = userEvent.setup();
    const upload = deferred<UploadResult>();
    vi.mocked(uploadPhoto).mockReturnValue(upload.promise);
    const onBusyChange = vi.fn();
    const spy = vi.fn();
    const { unmount } = render(<Harness onBusyChange={onBusyChange} spy={spy} />);
    await user.upload(fileInput(), jpg());
    await vi.waitFor(() => expect(uploadPhoto).toHaveBeenCalled());

    unmount();
    await act(async () => upload.resolve({ ok: true, src: NEW_SRC, width: 1200, height: 1600 }));

    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    expect(spy).not.toHaveBeenCalled();
  });
});
