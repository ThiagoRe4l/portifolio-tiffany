import { describe, expect, it, vi } from 'vitest';
import { defaultContent } from '@/content/defaults';
import type { SiteContent } from '@/content/types';
import { mirrorPhotos } from './photos';

// Spec 005, T07 (D6; RF-12; CA-11). As fotos do bucket vão para dentro do site
// publicado, e o conteúdo passa a apontar para /fotos/. A rede é um fetch falso.

const SUPABASE_URL = 'https://projeto-teste.supabase.co';
const BUCKET = `${SUPABASE_URL}/storage/v1/object/public/site-photos/fotos`;
const A = '3f6c2a1e-7b4d-4e2a-9c1f-0a1b2c3d4e5f';
const B = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';

function content(): SiteContent {
  const copy = structuredClone(defaultContent) as SiteContent;
  copy.inicio.photo = {
    ...copy.inicio.photo,
    src: `${BUCKET}/${A}-1600w.webp`,
    width: 1600,
    height: 1200,
  };
  // A mesma foto em outro lugar: baixada uma vez só.
  copy.geral.shareImage = {
    ...copy.geral.shareImage,
    src: `${BUCKET}/${A}-1600w.webp`,
    width: 1600,
    height: 1200,
  };
  copy.sobre.photo = { ...copy.sobre.photo, src: 'https://exemplo.test/foto-externa.jpg' };
  copy.espaco.photos = [
    {
      caption: '',
      photo: { src: `${BUCKET}/${B}-1200w.jpg`, width: 1200, height: 1600, alt: 'Sala' },
    },
    { caption: '', photo: { src: '', width: 1, height: 1, alt: 'Sem foto ainda' } },
  ];
  return copy;
}

function fakeFetch(fail: (url: string) => 'throw' | number | null = () => null) {
  const requested: string[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    requested.push(url);
    const failure = fail(url);
    if (failure === 'throw') throw new TypeError('fetch failed');
    if (typeof failure === 'number') return new Response('erro', { status: failure });
    return new Response(new TextEncoder().encode(`bytes de ${url.split('/').pop()}`));
  });
  return { fetch: fetcher as unknown as typeof fetch, requested };
}

const run = (
  overrides: Partial<Parameters<typeof mirrorPhotos>[1]> = {},
  fail?: Parameters<typeof fakeFetch>[0],
) => {
  const fake = fakeFetch(fail);
  const result = mirrorPhotos(content(), {
    supabaseUrl: SUPABASE_URL,
    fetch: fake.fetch,
    required: true,
    ...overrides,
  });
  return { result, requested: fake.requested };
};

describe('mirrorPhotos', () => {
  it('baixa as versões de cada foto do bucket, uma vez por foto', async () => {
    const { result, requested } = run();
    await result;

    expect(requested.sort()).toEqual(
      [
        `${BUCKET}/${A}-480w.webp`,
        `${BUCKET}/${A}-960w.webp`,
        `${BUCKET}/${A}-1600w.webp`,
        `${BUCKET}/${B}-480w.jpg`,
        `${BUCKET}/${B}-960w.jpg`,
        `${BUCKET}/${B}-1200w.jpg`,
      ].sort(),
    );
  });

  it('grava os arquivos em fotos/, com os bytes baixados', async () => {
    const { files } = await run().result;

    expect(Object.keys(files).sort()).toEqual(
      [
        `fotos/${A}-480w.webp`,
        `fotos/${A}-960w.webp`,
        `fotos/${A}-1600w.webp`,
        `fotos/${B}-480w.jpg`,
        `fotos/${B}-960w.jpg`,
        `fotos/${B}-1200w.jpg`,
      ].sort(),
    );
    expect(new TextDecoder().decode(files[`fotos/${A}-960w.webp`])).toBe(`bytes de ${A}-960w.webp`);
  });

  it('o conteúdo passa a apontar para /fotos/, sem mexer no resto', async () => {
    const original = content();
    const { content: mirrored } = await mirrorPhotos(original, {
      supabaseUrl: SUPABASE_URL,
      fetch: fakeFetch().fetch,
      required: true,
    });

    expect(mirrored.inicio.photo).toEqual({
      ...original.inicio.photo,
      src: `/fotos/${A}-1600w.webp`,
    });
    expect(mirrored.geral.shareImage.src).toBe(`/fotos/${A}-1600w.webp`);
    expect(mirrored.espaco.photos[0]?.photo.src).toBe(`/fotos/${B}-1200w.jpg`);
    expect(mirrored.sobre.photo.src).toBe('https://exemplo.test/foto-externa.jpg');
    expect(mirrored.espaco.photos[1]?.photo.src).toBe('');
    expect(mirrored.inicio.title).toBe(original.inicio.title);
    // O original não é alterado.
    expect(original.inicio.photo.src).toBe(`${BUCKET}/${A}-1600w.webp`);
  });

  it('fotos de outro bucket ou de outro projeto não são copiadas', async () => {
    const other = content();
    other.inicio.photo.src = `${SUPABASE_URL}/storage/v1/object/public/outro-bucket/${A}-1600w.webp`;
    other.geral.shareImage.src = `https://outro-projeto.supabase.co/storage/v1/object/public/site-photos/fotos/${A}-1600w.webp`;
    const fake = fakeFetch();

    const { content: mirrored } = await mirrorPhotos(other, {
      supabaseUrl: SUPABASE_URL,
      fetch: fake.fetch,
      required: true,
    });

    expect(mirrored.inicio.photo.src).toBe(other.inicio.photo.src);
    expect(mirrored.geral.shareImage.src).toBe(other.geral.shareImage.src);
    expect(fake.requested.every((url) => url.includes(B))).toBe(true);
  });

  it('endereço do Supabase com barra no fim funciona igual', async () => {
    const { files } = await run({ supabaseUrl: `${SUPABASE_URL}/` }).result;

    expect(Object.keys(files)).toHaveLength(6);
  });

  it('sem Supabase configurado: nada é baixado e o conteúdo fica como está', async () => {
    const fake = fakeFetch();
    const original = content();

    const result = await mirrorPhotos(original, {
      supabaseUrl: '',
      fetch: fake.fetch,
      required: false,
    });

    expect(fake.requested).toEqual([]);
    expect(result.files).toEqual({});
    expect(result.content).toEqual(original);
  });

  it.each<[string, (url: string) => 'throw' | number | null]>([
    ['sem rede', (url) => (url.includes(`${B}-960w`) ? 'throw' : null)],
    ['HTTP 404', (url) => (url.includes(`${B}-960w`) ? 404 : null)],
  ])('%s com conteúdo obrigatório (produção): o build falha', async (_name, fail) => {
    await expect(run({}, fail).result).rejects.toThrow(/Falha ao copiar a foto .*-1200w\.jpg/);
  });

  it('falha sem conteúdo obrigatório: avisa e deixa só essa foto no endereço original', async () => {
    const {
      content: mirrored,
      files,
      warnings,
    } = await run({ required: false }, (url) => (url.includes(`${B}-960w`) ? 404 : null)).result;

    expect(mirrored.espaco.photos[0]?.photo.src).toBe(`${BUCKET}/${B}-1200w.jpg`);
    expect(Object.keys(files).some((name) => name.includes(B))).toBe(false);
    expect(mirrored.inicio.photo.src).toBe(`/fotos/${A}-1600w.webp`);
    expect(warnings).toEqual([expect.stringMatching(/Falha ao copiar a foto .*-1200w\.jpg/)]);
  });
});
