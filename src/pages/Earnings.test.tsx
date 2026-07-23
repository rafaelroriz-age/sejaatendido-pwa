import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import Earnings from './Earnings';
import type { Repasse, SaldoMedico } from '../services/api';

const fetchSaldoMedicoMock = vi.fn();
const fetchRepassesMock = vi.fn();
const fetchConsultasMedicoMock = vi.fn();
const fetchDadosBancariosMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../services/api', () => ({
  fetchSaldoMedico: (...args: unknown[]) => fetchSaldoMedicoMock(...args),
  fetchRepasses: (...args: unknown[]) => fetchRepassesMock(...args),
  fetchConsultasMedico: (...args: unknown[]) => fetchConsultasMedicoMock(...args),
  fetchDadosBancarios: (...args: unknown[]) => fetchDadosBancariosMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function baseSaldo(): SaldoMedico {
  return {
    saldo_a_liberar: 100,
    saldo_pendente: 50,
    ganhos_hoje: 0,
    proximo_repasse: '2026-05-15',
    ganhos_semana: [0, 0, 0, 0, 0, 0, 0],
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
