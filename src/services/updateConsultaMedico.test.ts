import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { API_URL } from '../config/api';
import { updateConsultaMedico } from './api';

// Regressão do bug crítico registrado em docs/plans/divergencias.md (2026-07-30):
// o backend passou a exigir `{ status: "ACEITA"|"RECUSADA"|"CONCLUIDA" }` no PATCH
// de aceite/recusa/conclusão de consulta pelo médico, e não mais `{ acao: "..." }`.
// Este teste garante que updateConsultaMedico envia o contrato correto e não regride.

let receivedBody: unknown;

const server = setupServer(
  http.patch(`${API_URL}/medicos/me/consultas/:id`, async ({ request }) => {
    receivedBody = await request.json();
    const body = receivedBody as { status?: string };
    const statusValidos = ['ACEITA', 'RECUSADA', 'CONCLUIDA'];
    if (!body.status || !statusValidos.includes(body.status)) {
      return HttpResponse.json(
        { erro: 'Dados invalidos', detalhes: [{ campo: 'status', mensagem: 'campo status invalido' }] },
        { status: 400 },
      );
    }
    return HttpResponse.json({ consulta: { id: 'consulta-1', status: body.status } });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  receivedBody = undefined;
  localStorage.setItem('@token', 'mock-jwt-token');
});

describe('updateConsultaMedico', () => {
  it('envia { status } (não mais { acao }) para o backend ao aceitar', async () => {
    await expect(updateConsultaMedico('consulta-1', 'ACEITA')).resolves.toBeUndefined();
    expect(receivedBody).toEqual({ status: 'ACEITA' });
  });

  it('envia { status, motivoRecusa } ao recusar', async () => {
    await expect(updateConsultaMedico('consulta-1', 'RECUSADA', 'Agenda cheia')).resolves.toBeUndefined();
    expect(receivedBody).toEqual({ status: 'RECUSADA', motivoRecusa: 'Agenda cheia' });
  });

  it('envia { status: "CONCLUIDA" } ao finalizar', async () => {
    await expect(updateConsultaMedico('consulta-1', 'CONCLUIDA')).resolves.toBeUndefined();
    expect(receivedBody).toEqual({ status: 'CONCLUIDA' });
  });
});
