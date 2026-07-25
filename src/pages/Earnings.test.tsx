import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Earnings from './Earnings';
import type { Consulta, Repasse, SaldoMedico } from '../services/api';

const fetchSaldoMedicoMock = vi.fn();
const fetchRepassesMock = vi.fn();
const fetchConsultasMedicoMock = vi.fn();
const fetchDadosBancariosMock = vi.fn();
const solicitarRepasseImediatoMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    fetchSaldoMedico: (...args: unknown[]) => fetchSaldoMedicoMock(...args),
    fetchRepasses: (...args: unknown[]) => fetchRepassesMock(...args),
    fetchConsultasMedico: (...args: unknown[]) => fetchConsultasMedicoMock(...args),
    fetchDadosBancarios: (...args: unknown[]) => fetchDadosBancariosMock(...args),
    solicitarRepasseImediato: (...args: unknown[]) => solicitarRepasseImediatoMock(...args),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function baseSaldo(overrides: Partial<SaldoMedico> = {}): SaldoMedico {
  return {
    saldo_a_liberar: 100,
    saldo_pendente: 50,
    ganhos_hoje: 0,
    proximo_repasse: '2026-05-15',
    ganhos_semana: [0, 0, 0, 0, 0, 0, 0],
    ...overrides,
  };
}

function baseRepasse(overrides: Partial<Repasse> = {}): Repasse {
  return {
    id: 'repasse-001',
    periodo: '04/05/2026 - 10/05/2026',
    valor: 150,
    status: 'pendente',
    data_repasse: '2026-05-10T23:59:59.000Z',
    ...overrides,
  };
}

// dataHora fixado em "agora" para sempre cair dentro da semana ISO corrente
// filtrada por Earnings.tsx (Monday..Monday), independente da data de execução do teste.
function baseConsultaSemana(overrides: Partial<Consulta> = {}): Consulta {
  return {
    id: 'consulta-1',
    medicoId: 'medico-1',
    pacienteId: 'paciente-1',
    dataHora: new Date().toISOString(),
    status: 'CONCLUIDA',
    pacienteNome: 'Paciente Teste',
    valor: 10000,
    ...overrides,
  } as Consulta;
}

async function renderEarnings() {
  render(
    <MemoryRouter>
      <Earnings />
    </MemoryRouter>,
  );
  await waitFor(() => expect(fetchRepassesMock).toHaveBeenCalled());
}

describe('Earnings — navegação para o detalhe do repasse', () => {
  beforeEach(() => {
    fetchSaldoMedicoMock.mockReset().mockResolvedValue(baseSaldo());
    fetchRepassesMock.mockReset();
    fetchConsultasMedicoMock.mockReset().mockResolvedValue([]);
    fetchDadosBancariosMock.mockReset().mockResolvedValue({ tipoChavePix: 'CPF', valorChavePix: '000.000.000-00' });
    solicitarRepasseImediatoMock.mockReset();
    navigateMock.mockReset();
  });

  it('navega usando o id do repasse individual (GET /medicos/me/repasses/:id)', async () => {
    fetchRepassesMock.mockResolvedValue([baseRepasse()]);

    await renderEarnings();

    fireEvent.click(screen.getByText('Histórico'));

    const item = await screen.findByText('R$ 150,00');
    fireEvent.click(item);

    expect(navigateMock).toHaveBeenCalledWith('/repasse/repasse-001', { state: { repasse: baseRepasse() } });
  });
});

describe('Earnings — repasse imediato (antecipação mediante taxa)', () => {
  beforeEach(() => {
    fetchSaldoMedicoMock.mockReset().mockResolvedValue(baseSaldo());
    fetchRepassesMock.mockReset().mockResolvedValue([]);
    fetchConsultasMedicoMock.mockReset().mockResolvedValue([]);
    fetchDadosBancariosMock.mockReset().mockResolvedValue({ tipoChavePix: 'CPF', chavePix: '000.000.000-00' });
    solicitarRepasseImediatoMock.mockReset();
    navigateMock.mockReset();
  });

  it('exibe a opção de repasse imediato com taxa quando há saldo disponível', async () => {
    await renderEarnings();

    expect(await screen.findByText('Solicitar repasse imediato')).toBeInTheDocument();
  });

  it('mostra taxa e valor líquido ao confirmar solicitação, e chama a API', async () => {
    solicitarRepasseImediatoMock.mockResolvedValue({
      taxa: 5,
      valor_liquido: 95,
      repasse: baseRepasse({ id: 'repasse-imediato-1', status: 'processando' }),
    });

    await renderEarnings();

    fireEvent.click(await screen.findByText('Solicitar repasse imediato'));

    expect(await screen.findByText('Confirmar solicitação')).toBeInTheDocument();
    expect(screen.getByText('Você recebe')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Confirmar solicitação'));

    await waitFor(() => expect(solicitarRepasseImediatoMock).toHaveBeenCalled());
    expect(await screen.findByText('Repasse imediato solicitado')).toBeInTheDocument();
  });

  it('não exibe a opção de repasse imediato quando não há saldo disponível', async () => {
    fetchSaldoMedicoMock.mockResolvedValue(baseSaldo({ saldo_a_liberar: 0 }));

    await renderEarnings();

    expect(screen.queryByText('Solicitar repasse imediato')).not.toBeInTheDocument();
  });
});

describe('Earnings — valor e status de pagamento das consultas da semana', () => {
  beforeEach(() => {
    fetchSaldoMedicoMock.mockReset().mockResolvedValue(baseSaldo());
    fetchRepassesMock.mockReset().mockResolvedValue([]);
    fetchConsultasMedicoMock.mockReset();
    fetchDadosBancariosMock.mockReset().mockResolvedValue({ tipoChavePix: 'CPF', chavePix: '000.000.000-00' });
    solicitarRepasseImediatoMock.mockReset();
    navigateMock.mockReset();
  });

  it('exibe o valor da consulta (convertido de centavos) e "Pago" quando concluída e paga', async () => {
    fetchConsultasMedicoMock.mockResolvedValue([
      baseConsultaSemana({ status: 'CONCLUIDA', pagamentoStatus: 'PAGO', valor: 10000 }),
    ]);

    await renderEarnings();

    expect(await screen.findByText('R$ 100,00')).toBeInTheDocument();
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });

  it('exibe "Aguardando pagamento" quando a consulta está concluída mas ainda não foi paga', async () => {
    fetchConsultasMedicoMock.mockResolvedValue([
      baseConsultaSemana({ status: 'CONCLUIDA', pagamentoStatus: undefined, valor: 5000 }),
    ]);

    await renderEarnings();

    expect(await screen.findByText('R$ 50,00')).toBeInTheDocument();
    expect(screen.getByText('Aguardando pagamento')).toBeInTheDocument();
  });

  it('exibe "Confirmada" quando a consulta foi aceita mas ainda não concluída', async () => {
    fetchConsultasMedicoMock.mockResolvedValue([
      baseConsultaSemana({ status: 'ACEITA', pagamentoStatus: undefined, valor: 8000 }),
    ]);

    await renderEarnings();

    expect(await screen.findByText('R$ 80,00')).toBeInTheDocument();
    expect(screen.getByText('Confirmada')).toBeInTheDocument();
  });

  it('exibe "Pendente" quando a consulta ainda não foi aceita pelo médico', async () => {
    fetchConsultasMedicoMock.mockResolvedValue([
      baseConsultaSemana({ status: 'PENDENTE', valor: 12000 }),
    ]);

    await renderEarnings();

    expect(await screen.findByText('R$ 120,00')).toBeInTheDocument();
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });
});
