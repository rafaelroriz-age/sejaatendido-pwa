import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Dashboard from './Dashboard';
import type { Consulta } from '../services/api';

type FetchMinhasConsultasFn = () => Promise<Consulta[]>;
const fetchMinhasConsultasMock = vi.fn<FetchMinhasConsultasFn>();

vi.mock('../services/api', () => ({
  fetchMinhasConsultas: (...args: unknown[]) => fetchMinhasConsultasMock(...(args as [])),
  cancelConsulta: vi.fn(),
  fetchPerfil: vi.fn().mockResolvedValue({ telefone: '11999999999' }),
  sendFrontendTelemetryEvent: vi.fn().mockResolvedValue(undefined),
  testarNotificacaoWhatsapp: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock('../storage/localStorage', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 'u1', nome: 'Paciente Teste' }),
  clearAuthSession: vi.fn(),
}));

function baseConsulta(overrides: Partial<Consulta>): Consulta {
  return {
    id: 'consulta-1',
    medicoId: 'medico-1',
    pacienteId: 'paciente-1',
    dataHora: '2026-07-20T18:00:00.000Z',
    status: 'PENDENTE',
    medico: { usuario: { nome: 'Dr. Teste' } } as any,
    ...overrides,
  } as Consulta;
}

async function renderDashboard() {
  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>,
  );
  // Aguarda o carregamento inicial (skeleton some / lista aparece).
  await waitFor(() => expect(fetchMinhasConsultasMock).toHaveBeenCalled());
}

describe('Dashboard — botão "Entrar na consulta"', () => {
  beforeEach(() => {
    fetchMinhasConsultasMock.mockReset();
    vi.useRealTimers();
  });

  it('exibe o botão quando status é ACEITA e o meetLink já foi gerado', async () => {
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'ACEITA', meetLink: 'https://meet.jit.si/SejaAtendido-abc123' }),
    ]);

    await renderDashboard();

    expect(await screen.findByText('Entrar na consulta')).toBeInTheDocument();
  });

  it('NÃO exibe o botão quando a consulta ainda está PENDENTE (médico não aceitou)', async () => {
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'PENDENTE' }),
    ]);

    await renderDashboard();

    await screen.findByText('Dr. Teste');
    expect(screen.queryByText('Entrar na consulta')).not.toBeInTheDocument();
  });

  it('NÃO exibe o botão quando meetLink existe mas o status ainda não é ACEITA/CONCLUIDA', async () => {
    // Regressão do bug original: o botão checava apenas `meetLink`, ignorando o status.
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'PENDENTE', meetLink: 'https://meet.jit.si/SejaAtendido-stale' }),
    ]);

    await renderDashboard();

    await screen.findByText('Dr. Teste');
    expect(screen.queryByText('Entrar na consulta')).not.toBeInTheDocument();
  });

  it('exibe o botão quando a consulta está CONCLUIDA e o meetLink existe', async () => {
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'CONCLUIDA', meetLink: 'https://meet.jit.si/SejaAtendido-abc123' }),
    ]);

    await renderDashboard();

    expect(await screen.findByText('Entrar na consulta')).toBeInTheDocument();
  });

  it('exibe mensagem informativa quando a consulta foi ACEITA mas o backend ainda não gerou o meetLink', async () => {
    // Cobre o bug conhecido em que o PATCH de aceite não persiste no backend e o
    // meetLink nunca é gerado: o paciente não deve ficar sem nenhum feedback.
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'ACEITA', meetLink: undefined }),
    ]);

    await renderDashboard();

    expect(await screen.findByText(/link da videochamada ainda não está disponível/i)).toBeInTheDocument();
    expect(screen.queryByText('Entrar na consulta')).not.toBeInTheDocument();
  });

  it('oferece acesso direto ao chat quando o meetLink ainda não existe', async () => {
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'ACEITA', meetLink: undefined }),
    ]);

    await renderDashboard();

    expect(await screen.findByRole('button', { name: /abrir chat da consulta/i })).toBeInTheDocument();
  });
});

describe('Dashboard — botão "Pagar consulta" (gate de pagamento pós-CONCLUIDA)', () => {
  beforeEach(() => {
    fetchMinhasConsultasMock.mockReset();
    vi.useRealTimers();
  });

  it('NÃO exibe "Pagar consulta" enquanto a consulta está PENDENTE (backend exige CONCLUIDA)', async () => {
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'PENDENTE' }),
    ]);

    await renderDashboard();

    await screen.findByText('Dr. Teste');
    expect(screen.queryByText('Pagar consulta')).not.toBeInTheDocument();
  });

  it('NÃO exibe "Pagar consulta" enquanto a consulta está ACEITA (ainda não concluída)', async () => {
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'ACEITA' }),
    ]);

    await renderDashboard();

    await screen.findByText('Dr. Teste');
    expect(screen.queryByText('Pagar consulta')).not.toBeInTheDocument();
  });

  it('exibe "Pagar consulta" quando a consulta está CONCLUIDA', async () => {
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'CONCLUIDA' }),
    ]);

    await renderDashboard();

    expect(await screen.findByText('Pagar consulta')).toBeInTheDocument();
  });

  it('NÃO exibe "Pagar consulta" para uma consulta CONCLUIDA cujo pagamento já veio PAGO da API', async () => {
    fetchMinhasConsultasMock.mockResolvedValue([
      baseConsulta({ status: 'CONCLUIDA', pagamentoStatus: 'PAGO' }),
    ]);

    await renderDashboard();

    await screen.findByText('Dr. Teste');
    expect(screen.queryByText('Pagar consulta')).not.toBeInTheDocument();
  });
});
