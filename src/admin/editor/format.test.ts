import { describe, expect, it } from 'vitest';
import { formatPublished, latestUpdate } from './format';

// Spec 004, T06 (RF-01).

describe('formatPublished', () => {
  it('data e hora no formato brasileiro', () => {
    expect(formatPublished('2026-11-10T14:32:05.123+00:00', 'America/Sao_Paulo')).toBe(
      '10/11/2026 às 11:32',
    );
  });

  it('meia-noite e virada de dia no fuso dela', () => {
    expect(formatPublished('2026-01-01T02:59:00Z', 'America/Sao_Paulo')).toBe(
      '31/12/2025 às 23:59',
    );
  });
});

describe('latestUpdate', () => {
  it('a gravação mais recente entre as seções', () => {
    expect(
      latestUpdate(['2026-11-10T10:00:00Z', null, '2026-11-11T09:00:00Z', '2026-11-09T23:00:00Z']),
    ).toBe('2026-11-11T09:00:00Z');
  });

  it('nenhuma seção gravada', () => {
    expect(latestUpdate([null, null])).toBeNull();
  });
});
