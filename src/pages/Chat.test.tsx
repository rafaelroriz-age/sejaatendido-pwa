import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Chat from './Chat';
import type { ChatSummary } from '../services/api';

const fetchChatsUsuarioMock = vi.fn<() => Promise<ChatSummary[]>>();
const fetchMensagensChatMock = vi.fn<() => Promise<unknown[]>>();
const fetchMinhasConsultasMock = vi.fn<() => Promise<unknown[]>>();
const fetchConsultasMedicoMock = vi.fn<() => Promise<unknown[]>>();

vi.mock('../services/api', () => ({
  fetchChatsUsuario: (...args: unknown[]) => fetchChatsUsuarioMock(...(args as [])),
  fetchMensagensChat: (...args: unknown[]) => fetchMensagensChatMock(...(args as [])),
  enviarMensagem: vi.fn(),
  fetchMinhasConsultas: (...args: unknown[]) => fetchMinhasConsultasMock(...(args as [])),
  fetchConsultasMedico: (...args: unknown[]) => fetchConsultasMedicoMock(...(args as [])),
}));

vi.mock('../storage/localStorage', () => ({
  getUser: vi.fn().mockResolvedValue({ id: 'paciente-1', tipo: 'PACIENTE', nome: 'Paciente Teste' }),
}));

describe('Chat - atalho de WhatsApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    });
    fetchChatsUsuarioMock.mockReset();
    fetchMensagensChatMock.mockReset();
    fetchMinhasConsultasMock.mockReset();
    fetchConsultasMedicoMock.mockReset();

    fetchMensagensChatMock.mockResolvedValue([]);
    fetchMinhasConsultasMock.mockResolvedValue([]);
    fetchConsultasMedicoMock.mockResolvedValue([]);
  });

  it('abre wa.me com o telefone da outra parte quando disponível no chat', async () => {
    fetchChatsUsuarioMock.mockResolvedValue([
      {
        chatId: 'chat-1',
        consultaId: 'consulta-1',
        outraParte: { id: 'medico-1', nome: 'Dr. Carlos', telefone: '+55 (11) 99999-8888' },
      },
    ]);

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <MemoryRouter>
        <Chat />
      </MemoryRouter>,
    );

    const conversa = await screen.findByText('Dr. Carlos');
    await userEvent.click(conversa);

    const btnWhatsapp = await screen.findByRole('button', { name: /abrir conversa no whatsapp/i });
    expect(btnWhatsapp).toBeEnabled();

    await userEvent.click(btnWhatsapp);

    expect(openSpy).toHaveBeenCalledTimes(1);
    const calledUrl = openSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('https://wa.me/5511999998888');
    expect(calledUrl).toContain('?text=');
  });

  it('usa telefone da consulta como fallback quando o chat nao traz telefone', async () => {
    fetchChatsUsuarioMock.mockResolvedValue([
      {
        chatId: 'chat-2',
        consultaId: 'consulta-2',
        outraParte: { id: 'medico-2', nome: 'Dra. Ana' },
      },
    ]);

    fetchMinhasConsultasMock.mockResolvedValue([
      {
        id: 'consulta-2',
        medico: { usuario: { telefone: '11977776666' } },
      },
    ]);

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <MemoryRouter>
        <Chat />
      </MemoryRouter>,
    );

    const conversa = await screen.findByText('Dra. Ana');
    await userEvent.click(conversa);

    const btnWhatsapp = await screen.findByRole('button', { name: /abrir conversa no whatsapp/i });
    await waitFor(() => expect(btnWhatsapp).toBeEnabled());

    await userEvent.click(btnWhatsapp);

    const calledUrl = openSpy.mock.calls[0]?.[0] as string;
    expect(calledUrl).toContain('https://wa.me/5511977776666');
  });

  it('abre a conversa e expõe o link da reunião diretamente no chat quando a consulta já possui meetLink', async () => {
    fetchChatsUsuarioMock.mockResolvedValue([
      {
        chatId: 'chat-3',
        consultaId: 'consulta-3',
        outraParte: { id: 'medico-3', nome: 'Dr. João' },
      },
    ]);

    fetchMinhasConsultasMock.mockResolvedValue([
      {
        id: 'consulta-3',
        status: 'ACEITA',
        meetLink: 'https://meet.jit.si/consulta-3',
        medico: { usuario: { telefone: '11933334444' } },
      },
    ]);

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(
      <MemoryRouter initialEntries={['/chat?consultaId=consulta-3']}>
        <Chat />
      </MemoryRouter>,
    );

    const btnReuniao = await screen.findByRole('button', { name: /abrir reunião/i });
    expect(btnReuniao).toBeEnabled();

    await userEvent.click(btnReuniao);

    expect(openSpy).toHaveBeenCalledWith('https://meet.jit.si/consulta-3', '_blank', 'noopener,noreferrer');
  });
});
