/**
 * Foto de teste com metadados de câmera (spec 005, T08): insere num JPEG um bloco EXIF
 * com orientação "girar 90° no sentido horário" (6, foto de celular em pé) e
 * localização (latitude 23° 32' S). Montado byte a byte, sem biblioteca.
 */

const ORIENTATION_ROTATE_90 = 6;

function tiff(): Uint8Array {
  const buffer = new ArrayBuffer(92);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let at = 0;
  const u16 = (value: number) => {
    view.setUint16(at, value, true);
    at += 2;
  };
  const u32 = (value: number) => {
    view.setUint32(at, value, true);
    at += 4;
  };

  // Cabeçalho TIFF little-endian, primeiro IFD em 8.
  bytes.set([0x49, 0x49], 0);
  at = 2;
  u16(42);
  u32(8);

  // IFD0 (em 8): orientação e ponteiro para o IFD de GPS (em 38).
  u16(2);
  u16(0x0112);
  u16(3);
  u32(1);
  u16(ORIENTATION_ROTATE_90);
  u16(0);
  u16(0x8825);
  u16(4);
  u32(1);
  u32(38);
  u32(0);

  // IFD de GPS (em 38): hemisfério e latitude (três racionais em 68).
  u16(2);
  u16(0x0001);
  u16(2);
  u32(2);
  bytes.set([0x53, 0x00, 0x00, 0x00], at); // "S\0"
  at += 4;
  u16(0x0002);
  u16(5);
  u32(3);
  u32(68);
  u32(0);

  for (const [numerator, denominator] of [
    [23, 1],
    [32, 1],
    [0, 1],
  ] as const) {
    u32(numerator);
    u32(denominator);
  }
  return bytes;
}

/** Devolve o JPEG com o bloco EXIF logo depois do marcador inicial (SOI). */
export function withCameraExif(jpeg: Uint8Array): Uint8Array {
  if (jpeg[0] !== 0xff || jpeg[1] !== 0xd8) throw new Error('Não é um JPEG');
  const body = new Uint8Array([...new TextEncoder().encode('Exif'), 0, 0, ...tiff()]);
  const length = body.length + 2;
  const segment = new Uint8Array([0xff, 0xe1, length >> 8, length & 0xff, ...body]);
  return new Uint8Array([...jpeg.subarray(0, 2), ...segment, ...jpeg.subarray(2)]);
}

/** O arquivo tem um bloco EXIF? */
export const hasExif = (bytes: Uint8Array): boolean =>
  Buffer.from(bytes).includes(Buffer.from('Exif\0\0', 'latin1'));
