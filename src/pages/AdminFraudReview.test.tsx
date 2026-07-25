import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminFraudReview from './AdminFraudReview';
import type { CasoRisco } from '../services/api';

const fetchCasosRiscoMock = vi.fn();
const decidirCasoRiscoMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    fetchCasosRisco: (...args: unknown[]) => fetchCasosRiscoMock(...args),
    decidirCasoRisco: (...args: unknown[]) => decidirCasoRiscoMock(...args),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function baseCaso(overrides: Partial<CasoRisco> = {}): CasoRisco {
  return {
    id: 'caso-001',
    status: 'PENDENTE',
    criadoEm: '2026-07-20T10:00:00.000Z',
    pagamento: { id: 'pag-001', valor: 150, metodo: 'cartao' },
    paciente: { id: 'paciente-001', nome: 'Fulano de Tal', email: 'fulano@teste.com' },
    riscoAvaliacao: { score: 82, faixa: 'ALTO' },
    ...overrides,
  };
}

async function renderPage() {
  render(
    <MemoryRouter>
      <AdminFraudReview />
    </MemoryRouter>,
  );
  await waitFor(() => expect(fetchCasosRiscoMock).toHaveBeenCalled());
}

describe('AdminFraudReview', () => {
  beforeEach(() => {
    fetchCasosRiscoMock.mockReset().mockResolvedValue([]);
    decidirCasoRiscoMock.mockReset();
    navigateMock.mockReset();
    vi.spyOn(window, 'prompt').mockReturnValue('Motivo de teste');
  });

  it('exibe estado vazio quando não há casos pendentes', async () => {
    await renderPage();
    expect(await screen.findByText('Nenhum caso')).toBeInTheDocument();
  });

  it('lista um caso pendente com faixa de risco e valor', async () => {
    fetchCasosRiscoMock.mockResolvedValue([baseCaso()]);
    await renderPage();

    expect(await screen.findByText('Fulano de Tal')).toBeInTheDocument();
    expect(screen.getByText('R$ 150,00')).toBeInTheDocument();
    expect(screen.getByText('Risco alto')).toBeInTheDocument();
  });

  it('aprova um caso e remove da lista', async () => {
    fetchCasosRiscoMock.mockResolvedValue([baseCaso()]);
    decidirCasoRiscoMock.mockResolvedValue(baseCaso({ status: 'APROVADO' }));
    await renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Aprovar caso de Fulano de Tal/i }));

    await waitFor(() => expect(decidirCasoRiscoMock).toHaveBeenCalledWith('caso-001', 'APROVAR'));
    await waitFor(() => expect(screen.queryByText('Fulano de Tal')).not.toBeInTheDocument());
  });

  it('bloqueia um caso pedindo motivo e remove da lista', async () => {
    fetchCasosRiscoMock.mockResolvedValue([baseCaso()]);
    decidirCasoRiscoMock.mockResolvedValue(baseCaso({ status: 'BLOQUEADO' }));
    await renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Bloquear caso de Fulano de Tal/i }));

    await waitFor(() => expect(decidirCasoRiscoMock).toHaveBeenCalledWith('caso-001', 'BLOQUEAR', 'Motivo de teste'));
    await waitFor(() => expect(screen.queryByText('Fulano de Tal')).not.toBeInTheDocument());
  });

  it('troca de aba e recarrega os casos filtrados por status', async () => {
    fetchCasosRiscoMock.mockResolvedValue([]);
    await renderPage();

    fireEvent.click(screen.getByRole('tab', { name: 'Aprovados' }));

    await waitFor(() => expect(fetchCasosRiscoMock).toHaveBeenCalledWith('APROVADO'));
  });
});
