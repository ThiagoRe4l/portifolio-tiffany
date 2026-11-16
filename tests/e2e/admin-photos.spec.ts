import { expect, test, type Page } from '@playwright/test';
import { checkA11y } from './support/a11y';
import { watchConsole } from './support/browser';
import { gotoWithContent } from './support/content';
import { hasExif, withCameraExif } from './support/exif';
import { mockSupabase, seedSession, type SupabaseMock } from './support/supabase';

// Spec 005, T08 (CA-01, CA-03, CA-04, CA-05, CA-10 e CA-13 no navegador).
// A foto de teste é gerada no próprio navegador; o Storage é o falso, em memória.

const REVIEW = 'Confira se o texto alternativo descreve a foto nova.';

/** JPEG 4000×3000 gerado no navegador: metade esquerda vermelha, direita azul. */
async function makeJpeg(page: Page, width = 4000, height = 3000): Promise<Uint8Array> {
  const base64 = await page.evaluate(
    ([w, h]) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const context = canvas.getContext('2d') as CanvasRenderingContext2D;
      context.fillStyle = '#ff0000';
      context.fillRect(0, 0, w / 2, h);
      context.fillStyle = '#0000ff';
      context.fillRect(w / 2, 0, w / 2, h);
      return canvas.toDataURL('image/jpeg', 0.85).split(',')[1] ?? '';
    },
    [width, height] as const,
  );
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/** Decodifica no navegador: dimensões e as cores no alto e embaixo, no meio. */
async function inspect(page: Page, bytes: Buffer, type: string) {
  return page.evaluate(
    async ([base64, mime]) => {
      const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([binary], { type: mime }));
      // <canvas> comum: o WebKit do Playwright não tem OffscreenCanvas.
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      // willReadFrequently: sem ele, o Chrome avisa no console ao ler os pixels.
      const context = canvas.getContext('2d', {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D;
      context.drawImage(bitmap, 0, 0);
      const color = (y: number) => {
        const [r = 0, g = 0, b = 0] = context.getImageData(bitmap.width / 2, y, 1, 1).data;
        return r > 180 && g < 80 && b < 80
          ? 'vermelho'
          : b > 180 && r < 80 && g < 80
            ? 'azul'
            : `${r},${g},${b}`;
      };
      return {
        width: bitmap.width,
        height: bitmap.height,
        top: color(Math.round(bitmap.height * 0.25)),
        bottom: color(Math.round(bitmap.height * 0.75)),
      };
    },
    [bytes.toString('base64'), type] as const,
  );
}

async function openPhotoField(page: Page) {
  const mock = await mockSupabase(page);
  await seedSession(page);
  await page.goto('/admin?secao=sobre');
  const group = page.getByRole('group', { name: 'Foto', exact: true });
  await expect(group).toBeVisible();
  return { mock, group };
}

async function choose(
  group: ReturnType<Page['getByRole']>,
  bytes: Uint8Array,
  name: string,
  mimeType: string,
) {
  await group
    .locator('input[type="file"]')
    .setInputFiles({ name, mimeType, buffer: Buffer.from(bytes) });
}

const uploadsByCode = (mock: SupabaseMock) => {
  const codes = new Map<string, { width: number; type: string; bytes: Buffer }[]>();
  for (const [path, file] of mock.uploads) {
    const match = /^fotos\/(.+)-(\d+)w\.(webp|jpg)$/.exec(path);
    if (!match?.[1]) throw new Error(`nome fora da regra: ${path}`);
    codes.set(match[1], [...(codes.get(match[1]) ?? []), { width: Number(match[2]), ...file }]);
  }
  return codes;
};

test.describe('foto do celular', () => {
  test('4000×3000 em retrato com localização: chega reduzida, em pé, sem EXIF, nas três versões', async ({
    page,
    browserName,
  }) => {
    const problems = watchConsole(page, browserName);
    const { mock, group } = await openPhotoField(page);
    const photo = withCameraExif(await makeJpeg(page));
    // A foto de teste tem mesmo os metadados, e o navegador entende a orientação.
    expect(hasExif(photo)).toBe(true);

    await choose(group, photo, 'IMG_2026-11-15_Ana.jpg', 'image/jpeg');

    await expect(group.getByText(REVIEW)).toBeVisible();
    const [versions = []] = [...uploadsByCode(mock).values()];
    expect(versions.map((version) => version.width).sort((a, b) => a - b)).toEqual([
      480, 960, 1200,
    ]);
    const types = new Set(versions.map((version) => version.type));
    expect(types.size).toBe(1);
    const [type = ''] = types;
    expect(['image/webp', 'image/jpeg']).toContain(type);
    test
      .info()
      .annotations.push({ type: 'formato gerado', description: `${browserName}: ${type}` });

    for (const version of versions) {
      expect(hasExif(version.bytes), `versão ${version.width} com EXIF`).toBe(false);
      expect(version.bytes.includes(Buffer.from('IMG_2026', 'latin1'))).toBe(false);
      const seen = await inspect(page, version.bytes, version.type);
      // Em pé (retrato) e girada: o lado esquerdo do original (vermelho) fica em cima.
      expect(seen).toEqual({
        width: version.width,
        height: Math.round((version.width * 4) / 3),
        top: 'vermelho',
        bottom: 'azul',
      });
    }
    const largest = versions.find((version) => version.width === 1200);
    expect(largest?.bytes.length ?? Infinity).toBeLessThan(300 * 1024);
    expect([...mock.uploads.keys()].join(' ')).not.toContain('IMG_');
    expect(mock.outside).toEqual([]);
    expect(problems).toEqual([]);
  });

  test('foto pequena (300×200): uma versão só, sem ampliar', async ({ page }) => {
    const { mock, group } = await openPhotoField(page);
    const small = await makeJpeg(page, 300, 200);

    await choose(group, small, 'pequena.jpg', 'image/jpeg');

    await expect(group.getByText(REVIEW)).toBeVisible();
    const [versions = []] = [...uploadsByCode(mock).values()];
    expect(versions.map((version) => version.width)).toEqual([300]);
    const seen = await inspect(
      page,
      versions[0]?.bytes ?? Buffer.alloc(0),
      versions[0]?.type ?? '',
    );
    expect([seen.width, seen.height]).toEqual([300, 200]);
  });

  test('arquivo que não é foto: mensagem junto do campo e nada enviado', async ({ page }) => {
    const { mock, group } = await openPhotoField(page);

    await choose(group, new TextEncoder().encode('GIF89a'), 'animacao.gif', 'image/gif');

    await expect(group.getByRole('alert')).toHaveText('Use uma foto em JPG, PNG ou WebP.');
    expect(mock.uploads.size).toBe(0);
  });

  test('escolher a mesma foto de novo também envia', async ({ page }) => {
    const { mock, group } = await openPhotoField(page);
    const photo = await makeJpeg(page, 800, 600);

    await choose(group, photo, 'sala.jpg', 'image/jpeg');
    await expect(group.getByText(REVIEW)).toBeVisible();
    await choose(group, photo, 'sala.jpg', 'image/jpeg');

    await expect.poll(() => uploadsByCode(mock).size).toBe(2);
  });

  test('salvar e recarregar: a miniatura é a foto nova, servida pelo Storage', async ({ page }) => {
    const { mock, group } = await openPhotoField(page);

    await choose(group, await makeJpeg(page, 1600, 1200), 'sala.jpg', 'image/jpeg');
    await expect(group.getByText(REVIEW)).toBeVisible();
    await page.getByRole('button', { name: 'Salvar e publicar' }).click();
    await expect(page.getByText('Publicado. O site atualiza em alguns minutos.')).toBeVisible();
    const saved = (mock.writes.at(-1)?.body.data as { photo: { src: string; width: number } })
      .photo;
    expect(saved.src).toMatch(
      /\/storage\/v1\/object\/public\/site-photos\/fotos\/.+-1600w\.(webp|jpg)$/,
    );
    expect(saved.width).toBe(1600);

    await page.reload();

    const thumbnail = page.getByRole('group', { name: 'Foto', exact: true }).locator('img');
    await expect(thumbnail).toHaveAttribute('src', saved.src.replace('-1600w.', '-480w.'));
    await expect
      .poll(() => thumbnail.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBe(480);
  });

  test('campo de foto com a foto nova: axe sem violações e toque com 48px', async ({ page }) => {
    const { group } = await openPhotoField(page);
    await choose(group, await makeJpeg(page, 800, 600), 'sala.jpg', 'image/jpeg');
    await expect(group.getByText(REVIEW)).toBeVisible();

    await checkA11y(page);
    const button = group.getByRole('button', { name: 'Trocar foto: Foto' });
    const box = await button.boundingBox();
    expect(Math.min(box?.width ?? 0, box?.height ?? 0)).toBeGreaterThanOrEqual(47.5);
  });
});

// O build do E2E usa o conteúdo padrão (sem fotos): as fotos entram pelo conteúdo
// embutido, e /fotos/ responde com uma imagem qualquer, porque aqui importa qual
// versão o navegador escolhe, não o desenho.
test.describe('site com fotos (CA-10)', () => {
  const CODE = '3f6c2a1e-7b4d-4e2a-9c1f-0a1b2c3d4e5f';
  const PIXEL = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  );

  test('cada foto usa uma versão que cobre a área exibida', async ({ page }) => {
    await page.route('**/fotos/**', (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PIXEL }),
    );
    await gotoWithContent(page, (content) => {
      const photo = (alt: string) => ({
        src: `/fotos/${CODE}-1600w.webp`,
        width: 1600,
        height: 1200,
        alt,
      });
      content.inicio.photo = photo(content.inicio.photo.alt);
      content.sobre.photo = photo(content.sobre.photo.alt);
      content.espaco.photos = content.espaco.photos.map((item) => ({
        ...item,
        photo: photo(item.photo.alt),
      }));
    });

    const images = page.locator('main img');
    // O site monta do zero (o #root foi esvaziado): espera as fotos antes de contar.
    await expect.poll(() => images.count()).toBeGreaterThanOrEqual(3);
    const count = await images.count();
    const problems: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const image = images.nth(index);
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate((img: HTMLImageElement) => img.complete && img.currentSrc !== ''),
        )
        .toBe(true);
      const { chosen, needed, srcset } = await image.evaluate((img: HTMLImageElement) => {
        const rect = img.getBoundingClientRect();
        const aspect = 1600 / 1200;
        // object-fit: cover — a foto precisa cobrir a largura e a altura da área.
        const neededCss = Math.max(rect.width, rect.height * aspect);
        return {
          chosen: Number(/-(\d+)w\./.exec(img.currentSrc)?.[1] ?? 0),
          needed: Math.round(Math.min(neededCss * devicePixelRatio, 1600)),
          srcset: img.srcset,
        };
      });
      expect(srcset).toContain('480w');
      // Tolerância de 10%: o navegador arredonda e pode reaproveitar uma versão já baixada.
      if (chosen < needed * 0.9)
        problems.push(`foto ${index + 1}: escolheu ${chosen}, precisava de ${needed}`);
    }

    expect(problems).toEqual([]);
  });
});
