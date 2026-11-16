import { describe, expect, it, vi } from 'vitest';
import {
  checkPhotoFile,
  MAX_INPUT_BYTES,
  preparePhoto,
  type CanvasLike,
  type PhotoDeps,
} from './preparePhoto';

// Spec 005, T03 (D2; RF-02 a RF-04; CA-02 e a lógica de CA-03 e CA-04).
// O jsdom não desenha imagens: o canvas e a leitura da foto são simulados e registram
// o que foi pedido. A prova com foto real fica no E2E (T08).

const MB = 1024 * 1024;

function file(type: string, size = 1000, name = 'IMG_2026-11-15_Ana.jpg'): File {
  const created = new File([new Uint8Array(1)], name, { type });
  Object.defineProperty(created, 'size', { value: size });
  return created;
}

type Call = { width: number; height: number; ops: string[]; encoded: [string, number][] };

function fakeDeps(
  bitmap: { width: number; height: number },
  options: { webp?: boolean; decodeFails?: boolean; encodeFails?: boolean } = {},
) {
  const calls: Call[] = [];
  const close = vi.fn();
  const decode = vi.fn(async () => {
    if (options.decodeFails) throw new Error('decode');
    return { ...bitmap, close };
  });
  const createCanvas = (width: number, height: number): CanvasLike => {
    const call: Call = { width, height, ops: [], encoded: [] };
    calls.push(call);
    const context = {
      fillStyle: '',
      imageSmoothingEnabled: false,
      imageSmoothingQuality: 'low' as ImageSmoothingQuality,
      fillRect: (...args: number[]) => call.ops.push(`fill ${context.fillStyle} ${args.join(',')}`),
      drawImage: (_image: unknown, ...args: number[]) =>
        call.ops.push(`draw ${args.join(',')} ${context.imageSmoothingQuality}`),
    };
    return {
      getContext: () => context,
      toBlob: async (type: string, quality: number) => {
        if (options.encodeFails) throw new Error('encode');
        call.encoded.push([type, quality]);
        const produced = type === 'image/webp' && options.webp === false ? 'image/png' : type;
        return new Blob([new Uint8Array(4)], { type: produced });
      },
    };
  };
  const deps: PhotoDeps = { decode, createCanvas };
  return { deps, calls, decode, close };
}

describe('checkPhotoFile (RF-02, RF-03)', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('%s é aceito', (type) => {
    expect(checkPhotoFile(file(type))).toEqual({ ok: true });
  });

  it.each(['image/gif', 'application/pdf', 'image/heic', 'image/svg+xml', ''])(
    '%j é recusado pelo tipo',
    (type) => {
      expect(checkPhotoFile(file(type))).toEqual({ ok: false, kind: 'type' });
    },
  );

  it('até 20 MB, inclusive', () => {
    expect(MAX_INPUT_BYTES).toBe(20 * MB);
    expect(checkPhotoFile(file('image/jpeg', 20 * MB))).toEqual({ ok: true });
    expect(checkPhotoFile(file('image/jpeg', 20 * MB + 1))).toEqual({
      ok: false,
      kind: 'tooLarge',
    });
  });
});

describe('preparePhoto (RF-04)', () => {
  it('arquivo recusado: nem chega a ser aberto', async () => {
    const { deps, decode } = fakeDeps({ width: 100, height: 100 });

    expect(await preparePhoto(file('image/gif'), deps)).toEqual({ ok: false, kind: 'type' });
    expect(decode).not.toHaveBeenCalled();
  });

  it('abre a foto aplicando a orientação gravada pela câmera', async () => {
    const { deps, decode } = fakeDeps({ width: 100, height: 100 });
    const photo = file('image/jpeg');

    await preparePhoto(photo, deps);

    expect(decode).toHaveBeenCalledExactlyOnceWith(photo);
  });

  it('paisagem 4000×3000: maior com 1600 de largura e as versões menores, na proporção', async () => {
    const { deps, calls } = fakeDeps({ width: 4000, height: 3000 });

    const result = await preparePhoto(file('image/jpeg'), deps);

    expect(calls.map(({ width, height }) => [width, height])).toEqual([
      [1600, 1200],
      [960, 720],
      [480, 360],
    ]);
    expect(result).toMatchObject({ ok: true, photo: { width: 1600, height: 1200, ext: 'webp' } });
    if (!result.ok) return;
    expect(result.photo.variants.map(({ width, height }) => [width, height])).toEqual([
      [480, 360],
      [960, 720],
      [1600, 1200],
    ]);
  });

  it('retrato 3000×4000: o lado maior fica com 1600', async () => {
    const { deps } = fakeDeps({ width: 3000, height: 4000 });

    const result = await preparePhoto(file('image/jpeg'), deps);

    expect(result).toMatchObject({ ok: true, photo: { width: 1200, height: 1600 } });
    if (!result.ok) return;
    expect(result.photo.variants.map(({ width }) => width)).toEqual([480, 960, 1200]);
  });

  it('foto pequena (300×200): uma versão só, sem ampliar', async () => {
    const { deps, calls } = fakeDeps({ width: 300, height: 200 });

    const result = await preparePhoto(file('image/png'), deps);

    expect(calls.map(({ width, height }) => [width, height])).toEqual([[300, 200]]);
    expect(result).toMatchObject({ ok: true, photo: { width: 300, height: 200 } });
  });

  it('fundo creme antes de desenhar (PNG transparente), com suavização alta', async () => {
    const { deps, calls } = fakeDeps({ width: 800, height: 600 });

    await preparePhoto(file('image/png'), deps);

    expect(calls[0]?.ops).toEqual(['fill #FAF6F0 0,0,800,600', 'draw 0,0,800,600 high']);
  });

  it('WebP com qualidade 0,82', async () => {
    const { deps, calls } = fakeDeps({ width: 2000, height: 1000 });

    const result = await preparePhoto(file('image/jpeg'), deps);

    expect(calls.every((call) => call.encoded[0]?.[0] === 'image/webp')).toBe(true);
    expect(calls[0]?.encoded[0]?.[1]).toBe(0.82);
    if (!result.ok) throw new Error('esperava sucesso');
    expect(result.photo.variants.every((variant) => variant.blob.type === 'image/webp')).toBe(true);
  });

  it('navegador sem WebP: todas as versões em JPG com qualidade 0,85', async () => {
    const { deps, calls } = fakeDeps({ width: 2000, height: 1000 }, { webp: false });

    const result = await preparePhoto(file('image/jpeg'), deps);

    expect(result).toMatchObject({ ok: true, photo: { ext: 'jpg' } });
    if (!result.ok) return;
    expect(result.photo.variants.every((variant) => variant.blob.type === 'image/jpeg')).toBe(true);
    expect(calls.at(-1)?.encoded.at(-1)).toEqual(['image/jpeg', 0.85]);
  });

  it.each([
    ['não abre (arquivo corrompido)', { decodeFails: true }],
    ['não gera a imagem (falta de memória)', { encodeFails: true }],
  ])('%s: unreadable', async (_name, options) => {
    const { deps } = fakeDeps({ width: 800, height: 600 }, options);

    expect(await preparePhoto(file('image/jpeg'), deps)).toEqual({ ok: false, kind: 'unreadable' });
  });

  it('libera a memória da foto aberta, com sucesso ou falha', async () => {
    const ok = fakeDeps({ width: 800, height: 600 });
    const failing = fakeDeps({ width: 800, height: 600 }, { encodeFails: true });

    await preparePhoto(file('image/jpeg'), ok.deps);
    await preparePhoto(file('image/jpeg'), failing.deps);

    expect(ok.close).toHaveBeenCalledTimes(1);
    expect(failing.close).toHaveBeenCalledTimes(1);
  });
});
