import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import BookAppointment from './BookAppointment';
import type { Medico, Consulta } from '../services/api';

type FetchMedicosFn = () => Promise<Medico[]>;
type FetchDisponibilidadeFn = (medicoId: string | string[], data: string) => Promise<string[]>;
type FetchMinhasConsultasFn = () => Promise<Consulta[]>;

const fetchMedicosMock = vi.fn<FetchMedicosFn>();
const fetchDisponibilidadeMedicoMock = vi.fn<FetchDisponibilidadeFn>();
const createConsultaMock = vi.fn();
const fetchMinhasConsultasMock = vi.fn<FetchMinhasConsultasFn>();

vi.mock('../services/api', () => ({
  fetchMedicos: (...args: unknown[]) => fetchMedicosMock(...(args as [])),
  fetchDisponibilidadeMedico: (...args: unknown[]) => fetchDisponibilidadeMedicoMock(...(args as [string | string[], string])),
  createConsulta: (...args: unknown[]) => createConsultaMock(...args),
  fetchMinhasConsultas: (...args: unknown[]) => fetchMinhasConsultasMock(...(args as [])),
}));

const MEDICO: Medico = {
  id: 'medico-1',
  usuarioId: 'usuario-1',
  valorConsulta: 10000,
  usuario: { id: 'usuario-1', nome: 'Dr. Teste', email: 'dr@teste.com' },
} as Medico;

// Horários futuros (o ambiente de teste roda com a data atual real da máquina).
const SLOT_OCUPADO = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const SLOT_LIVRE = new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString();

function horarioJaOcupadoError() {
  return {
    isAxiosError: true,
    response: { status: 400, data: { erro: 'Horário já ocupado' } },
  };
}

describe('BookAppointment — conflito de horário (400 "Horário já ocupado")', () => {
  beforeEach(() => {
    fetchMedicosMock.mockReset().mockResolvedValue([MEDICO]);
    fetchDisponibilidadeMedicoMock.mockReset();
    createConsultaMock.mockReset();
    fetchMinhasConsultasMock.mockReset().mockResolvedValue([]);
    vi.stubGlobal('alert', vi.fn());
  });

  it('mostra mensagem clara e recarrega os horários disponíveis, sem deixar o usuário reenviar o mesmo horário', async () => {
    fetchDisponibilidadeMedicoMock
      .mockResolvedValueOnce([SLOT_OCUPADO]) // primeira consulta de disponibilidade
      .mockResolvedValueOnce([SLOT_LIVRE]); // refresh após o 400 de conflito

    createConsultaMock.mockRejectedValueOnce(horarioJaOcupadoError());

    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BookAppointment />
      </MemoryRouter>,
    );

    // Passo 1: escolher médico
    const medicoOption = await screen.findByTestId('medico-option-medico-1');
    await user.click(medicoOption);

    // Passo 2: escolher a primeira data disponível (hoje)
    const dateOptions = document.querySelectorAll('[data-testid^="data-option-"]');
    expect(dateOptions.length).toBeGreaterThan(0);
    await user.click(dateOptions[0] as HTMLElement);

    // Aguarda a disponibilidade carregar e o slot ocupado aparecer
    const slotOcupado = await screen.findByTestId(`slot-option-${SLOT_OCUPADO}`);
    await user.click(slotOcupado);

    // Passo 3: confirmar agendamento
    const confirmarBtn = screen.getByTestId('confirmar-agendamento');
    await user.click(confirmarBtn);

    // O backend rejeitou com 400 "Horário já ocupado": deve alertar o usuário...
    await waitFor(() => expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Horário já ocupado')));

    // ...e recarregar a lista de horários (segunda chamada de disponibilidade).
    await waitFor(() => expect(fetchDisponibilidadeMedicoMock).toHaveBeenCalledTimes(2));

    // O novo horário livre deve estar disponível na tela, e o antigo (ocupado) não deve mais estar selecionado.
    expect(await screen.findByTestId(`slot-option-${SLOT_LIVRE}`)).toBeInTheDocument();
    expect(createConsultaMock).toHaveBeenCalledTimes(1);
  });
});
