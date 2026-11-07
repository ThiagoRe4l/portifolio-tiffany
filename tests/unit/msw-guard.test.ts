import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server, takeUnhandledRequests } from '../setup/msw';

// CA-07: nenhum teste pode bater no backend real.
describe('guarda do MSW', () => {
  it('rejeita e registra uma requisição sem handler', async () => {
    const url = 'https://api.example.test/sem-handler';

    await expect(fetch(url)).rejects.toThrow();
    // Prova que quem bloqueou foi o MSW (e não uma falha de DNS qualquer).
    expect(takeUnhandledRequests()).toEqual([`GET ${url}`]);
  });

  it('responde normalmente quando o teste registra um handler', async () => {
    const url = 'https://api.example.test/com-handler';
    server.use(http.get(url, () => HttpResponse.json({ ok: true })));

    const response = await fetch(url);

    expect(await response.json()).toEqual({ ok: true });
    expect(takeUnhandledRequests()).toEqual([]);
  });

  it('remove handlers de um teste antes do próximo', async () => {
    // O handler registrado no teste anterior não pode vazar para este.
    await expect(fetch('https://api.example.test/com-handler')).rejects.toThrow();
    expect(takeUnhandledRequests()).toHaveLength(1);
  });
});
