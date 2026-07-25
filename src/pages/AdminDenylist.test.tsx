import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import AdminDenylist from './AdminDenylist';
import type { DenylistEntry } from '../services/api';

const fetchDenylistMock = vi.fn();
const criarDenylistEntryMock = vi.fn();
const removerDenylistEntryMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../services/api', async () => {
  const actual = await vi.importActual<typeof import('../services/api')>('../services/api');
  return {
    ...actual,
    fetchDenylist: (...args: unknown[]) => fetchDenylistMock(...args),
    criarDenylistEntry: (...args: unknown[]) => criarDenylistEntryMock(...args),
    removerDenylistEntry: (...args: unknown[]) => removerDenylistEntryMock(...args),
  };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function baseEntry(overrides: Partial<DenylistEntry> = {}): DenylistEntry {
  return {
    id: 'denylist-001',
    tipo: 'EMAIL',
    valor: 'fraude@teste.com',
    motivo: 'Chargeback confirmado',
    criadoEm: '2026-07-20T10:00:00.000Z',
    ...overrides,
  };
}

async function renderPage() {
  render(
    <MemoryRouter>
      <AdminDenylist />
    </MemoryRouter>,
  );
  await waitFor(() => expect(fetchDenylistMock).toHaveBeenCalled());
}

describe('AdminDenylist', () => {
  beforeEach(() => {
    fetchDenylistMock.mockReset().mockResolvedValue([]);
    criarDenylistEntryMock.mockReset();
    removerDenylistEntryMock.mockReset();
    navigateMock.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('exibe estado vazio quando não há bloqueios', async () => {
    await renderPage();
    expect(await screen.findByText('Nenhum bloqueio')).toBeInTheDocument();
  });

  it('lista bloqueios existentes', async () => {
    fetchDenylistMock.mockResolvedValue([baseEntry()]);
    await renderPage();

    expect(await screen.findByText('fraude@teste.com')).toBeInTheDocument();
    expect(screen.getByText('Chargeback confirmado')).toBeInTheDocument();
  });

  it('valida campos obrigatórios antes de enviar', async () => {
    await renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'Adicionar bloqueio' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o valor a bloquear.');
    expect(criarDenylistEntryMock).not.toHaveBeenCalled();
  });

  it('valida formato de CPF quando o tipo selecionado é CPF', async () => {
    await renderPage();

    fireEvent.change(screen.getByLabelText('Valor a bloquear'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Teste' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar bloqueio' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('CPF deve ter 11 dígitos.');
    expect(criarDenylistEntryMock).not.toHaveBeenCalled();
  });

  it('cria um novo bloqueio e exibe na lista', async () => {
    criarDenylistEntryMock.mockResolvedValue(baseEntry({ id: 'denylist-002', tipo: 'CPF', valor: '11144477735', motivo: 'Cartão roubado' }));
    await renderPage();

    fireEvent.change(screen.getByLabelText('Valor a bloquear'), { target: { value: '111.444.777-35' } });
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'Cartão roubado' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar bloqueio' }));

    await waitFor(() => expect(criarDenylistEntryMock).toHaveBeenCalledWith({ tipo: 'CPF', valor: '111.444.777-35', motivo: 'Cartão roubado' }));
    expect(await screen.findByText('11144477735')).toBeInTheDocument();
  });

  it('remove um bloqueio existente após confirmação', async () => {
    fetchDenylistMock.mockResolvedValue([baseEntry()]);
    removerDenylistEntryMock.mockResolvedValue(undefined);
    await renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Remover bloqueio de fraude@teste.com/i }));

    await waitFor(() => expect(removerDenylistEntryMock).toHaveBeenCalledWith('denylist-001'));
    await waitFor(() => expect(screen.queryByText('fraude@teste.com')).not.toBeInTheDocument());
  });
});
