import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import Payment from './Payment';

const criarPagamentoMock = vi.fn();
const syncPagamentoMock = vi.fn();
const pagarComCartaoTokenMock = vi.fn();
const fetchCartoesSalvosMock = vi.fn();
const removerCartaoSalvoMock = vi.fn();
const navigateMock = vi.fn();
const getUserMock = vi.fn();
const tokenizeCreditCardMock = vi.fn();

vi.mock('../services/api', () => ({
  criarPagamento: (...args: unknown[]) => criarPagamentoMock(...args),
  syncPagamento: (...args: unknown[]) => syncPagamentoMock(...args),
  pagarComCartaoToken: (...args: unknown[]) => pagarComCartaoTokenMock(...args),
  fetchCartoesSalvos: (...args: unknown[]) => fetchCartoesSalvosMock(...args),
  removerCartaoSalvo: (...args: unknown[]) => removerCartaoSalvoMock(...args),
}));

vi.mock('../services/asaas', () => ({
  tokenizeCreditCard: (...args: unknown[]) => tokenizeCreditCardMock(...args),
}));

vi.mock('../storage/localStorage', () => ({
  getUser: (...args: unknown[]) => getUserMock(...args),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

function renderPayment(consultaId = 'consulta-1', valor = 10000) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/payment', state: { consultaId, valor } }]}>
      <Payment />
    </MemoryRouter>,
  );
}

async function preencherFormularioCartaoNovo() {
  fireEvent.change(await screen.findByLabelText(/número do cartão/i), { target: { value: '4444444444444444' } });
  fireEvent.change(screen.getByLabelText(/mês de validade/i), { target: { value: '12' } });
  fireEvent.change(screen.getByLabelText(/ano de validade/i), { target: { value: String(new Date().getFullYear() + 3) } });
  fireEvent.change(screen.getByLabelText(/^cvv$/i), { target: { value: '123' } });
  fireEvent.change(screen.getByLabelText(/nome impresso no cartão/i), { target: { value: 'Fulano de Tal' } });
  fireEvent.change(screen.getByLabelText(/email do titular/i), { target: { value: 'fulano@teste.com' } });
  fireEvent.change(screen.getByLabelText(/cpf do titular/i), { target: { value: '52998224725' } });
  fireEvent.change(screen.getByLabelText(/telefone do titular/i), { target: { value: '11988887777' } });
  fireEvent.change(screen.getByLabelText(/cep do titular/i), { target: { value: '01310930' } });
  fireEvent.change(screen.getByLabelText(/número do endereço/i), { target: { value: '123' } });
}


function semPagamentoExistenteError() {
  return { response: { status: 404, data: { erro: 'Nenhum pagamento encontrado' } } };
}

describe('Payment — idempotência do checkout (evitar preference duplicada)', () => {
  beforeEach(() => {
    criarPagamentoMock.mockReset();
    syncPagamentoMock.mockReset();
    navigateMock.mockReset();
    getUserMock.mockReset().mockResolvedValue(null);
    window.sessionStorage.clear();
    vi.useRealTimers();
  });

  it('não chama criarPagamento duas vezes ao clicar rapidamente em "Gerar código PIX"', async () => {
    syncPagamentoMock.mockRejectedValue(semPagamentoExistenteError());
    criarPagamentoMock.mockResolvedValue({
      pagamento: { id: 'pag-1', status: 'AGUARDANDO' },
      pix: {
        qrCode: 'codigo-copia-e-cola',
        qrCodeBase64: 'base64-fake',
        validade: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    });

    renderPayment();

    const btn = await screen.findByRole('button', { name: /gerar código pix/i });
    // Dois cliques disparados antes do primeiro re-render desabilitar o botão —
    // o guard por ref deve impedir a segunda chamada de qualquer forma.
    fireEvent.click(btn);
    fireEvent.click(btn);

    await waitFor(() => expect(screen.getByText('codigo-copia-e-cola')).toBeInTheDocument());
    expect(criarPagamentoMock).toHaveBeenCalledTimes(1);
  });

  it('reaproveita um pagamento AGUARDANDO já existente ao entrar na tela, sem criar um novo', async () => {
    syncPagamentoMock.mockResolvedValue({
      pagamento: { id: 'pag-existente', status: 'AGUARDANDO' },
      pix: {
        qrCode: 'codigo-existente',
        qrCodeBase64: 'base64-existente',
        validade: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
    });

    renderPayment();

    expect(await screen.findByText('codigo-existente')).toBeInTheDocument();
    expect(criarPagamentoMock).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: /gerar código pix/i })).not.toBeInTheDocument();
  });

  it('bloqueia o pagamento com mensagem clara quando a consulta ainda não está CONCLUIDA', async () => {
    syncPagamentoMock.mockRejectedValue(semPagamentoExistenteError());
    criarPagamentoMock.mockRejectedValue({
      response: { status: 400, data: { erro: 'Consulta ainda não foi concluída' } },
    });

    renderPayment();

    const btn = await screen.findByRole('button', { name: /gerar código pix/i });
    fireEvent.click(btn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/só é liberado depois que a consulta é marcada como concluída/i);
    // O CTA passa a ser "Tentar novamente" em vez de continuar oferecendo "Gerar código PIX".
    expect(screen.queryByRole('button', { name: /^gerar código pix$/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tentar novamente/i })).toBeInTheDocument();
  });
});

describe('Payment — polling de status', () => {
  beforeEach(() => {
    criarPagamentoMock.mockReset();
    syncPagamentoMock.mockReset();
    navigateMock.mockReset();
    getUserMock.mockReset().mockResolvedValue(null);
    window.sessionStorage.clear();
  });

  it('redireciona para o dashboard e para o polling quando o status chega a PAGO', async () => {
    syncPagamentoMock.mockRejectedValueOnce(semPagamentoExistenteError());
    criarPagamentoMock.mockResolvedValue({
      pagamento: { id: 'pag-1', status: 'AGUARDANDO' },
      pix: {
        qrCode: 'codigo-1',
        qrCodeBase64: 'b64',
        validade: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    });

    renderPayment();

    const btn = await screen.findByRole('button', { name: /gerar código pix/i });

    // Ativa fake timers só agora: o findByRole acima depende de timers reais
    // (waitFor interno da testing-library), e ativar antes travaria o teste.
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByText('codigo-1')).toBeInTheDocument();

    syncPagamentoMock.mockResolvedValue({ pagamento: { id: 'pag-1', status: 'PAGO' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    expect(navigateMock).toHaveBeenCalledWith('/dashboard', expect.objectContaining({
      state: expect.objectContaining({ paymentSuccess: true, consultaId: 'consulta-1' }),
    }));

    const callsRightAfterPago = syncPagamentoMock.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    // Não deve continuar chamando sync depois de já ter navegado (polling parado).
    expect(syncPagamentoMock.mock.calls.length).toBe(callsRightAfterPago);

    vi.useRealTimers();
  });

  it('para o polling quando o status chega a um estado terminal não-pago (ex.: FALHOU)', async () => {
    syncPagamentoMock.mockRejectedValueOnce(semPagamentoExistenteError());
    criarPagamentoMock.mockResolvedValue({
      pagamento: { id: 'pag-1', status: 'AGUARDANDO' },
      pix: {
        qrCode: 'codigo-2',
        qrCodeBase64: 'b64',
        validade: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    });

    renderPayment();

    const btn = await screen.findByRole('button', { name: /gerar código pix/i });

    vi.useFakeTimers();
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByText('codigo-2')).toBeInTheDocument();

    syncPagamentoMock.mockResolvedValue({ pagamento: { id: 'pag-1', status: 'FALHOU' } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });

    const callsAfterFalhou = syncPagamentoMock.mock.calls.length;
    expect(navigateMock).not.toHaveBeenCalled();

    // Mais 15s de espera não devem gerar novas chamadas: o polling já parou.
    await act(async () => { await vi.advanceTimersByTimeAsync(15000); });
    expect(syncPagamentoMock.mock.calls.length).toBe(callsAfterFalhou);

    vi.useRealTimers();
  });
});

describe('Payment — pagamento com cartão (tokenização client-side no Asaas)', () => {
  beforeEach(() => {
    criarPagamentoMock.mockReset();
    syncPagamentoMock.mockReset();
    pagarComCartaoTokenMock.mockReset();
    fetchCartoesSalvosMock.mockReset();
    removerCartaoSalvoMock.mockReset();
    tokenizeCreditCardMock.mockReset();
    navigateMock.mockReset();
    getUserMock.mockReset().mockResolvedValue(null);
    window.sessionStorage.clear();
    syncPagamentoMock.mockRejectedValue(semPagamentoExistenteError());
    fetchCartoesSalvosMock.mockResolvedValue([]);
  });

  async function selecionarCartao() {
    const cartaoTab = await screen.findByRole('button', { name: 'Cartão' });
    await act(async () => { fireEvent.click(cartaoTab); });
  }

  it('tokeniza um cartão novo e paga quando não há cartão salvo', async () => {
    tokenizeCreditCardMock.mockResolvedValue({
      creditCardToken: 'token-abc',
      creditCardNumber: '4444',
      creditCardBrand: 'VISA',
    });
    pagarComCartaoTokenMock.mockResolvedValue({
      pagamento: { id: 'pag-1', status: 'PAGO' },
      cartao: { status: 'approved', statusDetail: 'accredited', aprovado: true },
    });

    renderPayment();
    await selecionarCartao();
    await preencherFormularioCartaoNovo();

    const pagarBtn = await screen.findByRole('button', { name: /pagar com este cartão/i });
    await act(async () => { fireEvent.click(pagarBtn); });

    await waitFor(() => expect(pagarComCartaoTokenMock).toHaveBeenCalledWith(expect.objectContaining({
      consultaId: 'consulta-1',
      token: 'token-abc',
      ultimosDigitos: '4444',
      bandeira: 'VISA',
    })));

    expect(navigateMock).toHaveBeenCalledWith('/dashboard', expect.objectContaining({
      state: expect.objectContaining({ paymentSuccess: true, consultaId: 'consulta-1' }),
    }));
  });

  it('paga direto com um cartão salvo, sem tokenizar de novo', async () => {
    fetchCartoesSalvosMock.mockResolvedValue([
      { id: 'card-1', ultimosDigitos: '1234', bandeira: 'visa', titular: 'Fulano de Tal' },
    ]);
    pagarComCartaoTokenMock.mockResolvedValue({
      pagamento: { id: 'pag-2', status: 'PAGO' },
      cartao: { status: 'approved', statusDetail: 'accredited', aprovado: true },
    });

    renderPayment();
    await selecionarCartao();

    const pagarBtn = await screen.findByRole('button', { name: /pagar com cartão terminado em 1234/i });
    await act(async () => { fireEvent.click(pagarBtn); });

    expect(pagarComCartaoTokenMock).toHaveBeenCalledWith({ consultaId: 'consulta-1', cartaoId: 'card-1' });
    expect(tokenizeCreditCardMock).not.toHaveBeenCalled();
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith('/dashboard', expect.objectContaining({
      state: expect.objectContaining({ paymentSuccess: true, consultaId: 'consulta-1' }),
    })));
  });

  it('exibe o motivo da recusa e oferece pagar com Pix quando o cartão não é aprovado', async () => {
    fetchCartoesSalvosMock.mockResolvedValue([
      { id: 'card-1', ultimosDigitos: '1234', bandeira: 'visa', titular: 'Fulano de Tal' },
    ]);
    pagarComCartaoTokenMock.mockResolvedValue({
      pagamento: { id: 'pag-3', status: 'FALHOU' },
      cartao: { status: 'refused', statusDetail: 'cartão sem limite', aprovado: false },
    });

    renderPayment();
    await selecionarCartao();

    const pagarBtn = await screen.findByRole('button', { name: /pagar com cartão terminado em 1234/i });
    await act(async () => { fireEvent.click(pagarBtn); });

    expect(await screen.findByText(/pagamento não aprovado.*cartão sem limite/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();

    const pixBtn = screen.getByRole('button', { name: /tentar pagar com pix/i });
    await act(async () => { fireEvent.click(pixBtn); });
    expect(await screen.findByRole('button', { name: /gerar código pix/i })).toBeInTheDocument();
  });

  it('remove um cartão salvo da lista', async () => {
    fetchCartoesSalvosMock.mockResolvedValue([
      { id: 'card-1', ultimosDigitos: '1234', bandeira: 'visa', titular: 'Fulano de Tal' },
    ]);
    removerCartaoSalvoMock.mockResolvedValue(undefined);

    renderPayment();
    await selecionarCartao();

    const removerBtn = await screen.findByRole('button', { name: /remover cartão terminado em 1234/i });
    await act(async () => { fireEvent.click(removerBtn); });

    expect(removerCartaoSalvoMock).toHaveBeenCalledWith('card-1');
    await waitFor(() => expect(screen.queryByText(/1234/)).not.toBeInTheDocument());
  });
});

describe('Payment — casos de erro do gateway Asaas (CPF, consulta já paga, acesso negado)', () => {
  beforeEach(() => {
    criarPagamentoMock.mockReset();
    syncPagamentoMock.mockReset();
    navigateMock.mockReset();
    getUserMock.mockReset().mockResolvedValue(null);
    window.sessionStorage.clear();
    syncPagamentoMock.mockRejectedValue(semPagamentoExistenteError());
  });

  it('exibe mensagem amigável e permite ir ao perfil quando falta CPF (422)', async () => {
    criarPagamentoMock.mockRejectedValue({
      response: { status: 422, data: { erro: 'CPF obrigatório para prosseguir com o pagamento' } },
    });

    renderPayment();

    const btn = await screen.findByRole('button', { name: /gerar código pix/i });
    fireEvent.click(btn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/complete seu cadastro com cpf/i);
    const completarBtn = screen.getByRole('button', { name: /completar cadastro/i });
    fireEvent.click(completarBtn);
    expect(navigateMock).toHaveBeenCalledWith('/profile');
  });

  it('exibe mensagem amigável quando a consulta já foi paga (409)', async () => {
    criarPagamentoMock.mockRejectedValue({
      response: { status: 409, data: { erro: 'Pagamento já confirmado para esta consulta' } },
    });

    renderPayment();

    const btn = await screen.findByRole('button', { name: /gerar código pix/i });
    fireEvent.click(btn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/esta consulta já foi paga/i);
    const voltarBtn = screen.getByRole('button', { name: /voltar ao painel/i });
    fireEvent.click(voltarBtn);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('bloqueia a tela inteira quando a consulta pertence a outro paciente (403)', async () => {
    criarPagamentoMock.mockRejectedValue({
      response: { status: 403, data: { erro: 'Você não tem acesso a esta consulta' } },
    });

    renderPayment();

    const btn = await screen.findByRole('button', { name: /gerar código pix/i });
    fireEvent.click(btn);

    expect(await screen.findByRole('alert')).toHaveTextContent(/não tem permissão para acessar/i);
    expect(screen.queryByRole('button', { name: /gerar código pix/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^cartão$/i })).not.toBeInTheDocument();

    const voltarBtn = screen.getByRole('button', { name: /voltar ao painel/i });
    fireEvent.click(voltarBtn);
    expect(navigateMock).toHaveBeenCalledWith('/dashboard');
  });

  it('bloqueia o acesso já ao carregar a tela quando o sync retorna 403 de acesso negado', async () => {
    syncPagamentoMock.mockReset().mockRejectedValue({
      response: { status: 403, data: { erro: 'Você não tem acesso a esta consulta' } },
    });

    renderPayment();

    expect(await screen.findByRole('alert')).toHaveTextContent(/não tem permissão para acessar/i);
    expect(criarPagamentoMock).not.toHaveBeenCalled();
  });
});

describe('Payment — CPF obrigatório verificado proativamente antes de pagar', () => {
  beforeEach(() => {
    criarPagamentoMock.mockReset();
    syncPagamentoMock.mockReset().mockRejectedValue(semPagamentoExistenteError());
    navigateMock.mockReset();
    getUserMock.mockReset();
    window.sessionStorage.clear();
  });

  it('desabilita o botão de pagar e orienta a completar o cadastro quando o paciente não tem CPF', async () => {
    getUserMock.mockResolvedValue({ id: 'u1', nome: 'Paciente', email: 'p@x.com', tipo: 'PACIENTE', cpf: undefined });

    renderPayment();

    expect(await screen.findByText(/complete seu cadastro com cpf/i)).toBeInTheDocument();
    const btn = screen.getByRole('button', { name: /gerar código pix/i });
    expect(btn).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /completar cadastro/i }));
    expect(navigateMock).toHaveBeenCalledWith('/profile');
    expect(criarPagamentoMock).not.toHaveBeenCalled();
  });

  it('não bloqueia o pagamento quando o paciente já tem CPF cadastrado', async () => {
    getUserMock.mockResolvedValue({ id: 'u1', nome: 'Paciente', email: 'p@x.com', tipo: 'PACIENTE', cpf: '52998224725' });

    renderPayment();

    const btn = await screen.findByRole('button', { name: /gerar código pix/i });
    expect(btn).not.toBeDisabled();
    expect(screen.queryByText(/complete seu cadastro com cpf/i)).not.toBeInTheDocument();
  });
});
