import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import RepasseDetail from './RepasseDetail';
import type { Repasse } from '../services/api';

const fetchRepasseByIdMock = vi.fn();

vi.mock('../services/api', () => ({
  fetchRepasseById: (...args: unknown[]) => fetchRepasseByIdMock(...args),
}));

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

function renderDetail(state?: { repasse?: Repasse }) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/repasse/repasse-001', state }]}>
      <Routes>
        <Route path="/repasse/:id" element={<RepasseDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('RepasseDetail', () => {
  beforeEach(() => {
    fetchRepasseByIdMock.mockReset();
  });

  it('exibe os dados recebidos via navigation state imediatamente, sem depender da API', async () => {
    fetchRepasseByIdMock.mockReturnValue(new Promise(() => {})); // nunca resolve
    renderDetail({ repasse: baseRepasse() });

    expect(await screen.findByText('R$ 150,00')).toBeInTheDocument();
  });

  it('nao exibe erro quando o enriquecimento em segundo plano falha, mantendo os dados da listagem', async () => {
    fetchRepasseByIdMock.mockRejectedValue(new Error('falha'));
    renderDetail({ repasse: baseRepasse() });

    expect(await screen.findByText('R$ 150,00')).toBeInTheDocument();
    await waitFor(() => expect(fetchRepasseByIdMock).toHaveBeenCalledWith('repasse-001'));
    expect(screen.queryByText(/Nao foi possivel carregar/i)).not.toBeInTheDocument();
  });

  it('busca na API quando nao ha state (acesso direto/link profundo)', async () => {
    fetchRepasseByIdMock.mockResolvedValue(baseRepasse({ valor: 200 }));
    renderDetail(undefined);

    expect(await screen.findByText('R$ 200,00')).toBeInTheDocument();
    expect(fetchRepasseByIdMock).toHaveBeenCalledWith('repasse-001');
  });

  it('exibe erro com retry quando busca na API falha (acesso direto/link profundo)', async () => {
    fetchRepasseByIdMock.mockRejectedValue(new Error('falha'));
    renderDetail(undefined);

    expect(await screen.findByText(/Nao foi possivel carregar os detalhes do repasse/i)).toBeInTheDocument();
    expect(screen.getByText('Tentar novamente')).toBeInTheDocument();
  });
});
