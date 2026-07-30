import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import Payment from './Payment';

const criarPagamentoMock = vi.fn();
const syncPagamentoMock = vi.fn();
const navigateMock = vi.fn();

vi.mock('../services/api', () => ({
  criarPagamento: (...args: unknown[]) => criarPagamentoMock(...args),
  syncPagamento: (...args: unknown[]) => syncPagamentoMock(...args),
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

function semPagamentoExistenteError() {
  return { response: { status: 404, data: { erro: 'Nenhum pagamento encontrado' } } };
}

describe('Payment — idempotência do checkout (evitar preference duplicada)', () => {
  beforeEach(() => {
    criarPagamentoMock.mockReset();
    syncPagamentoMock.mockReset();
    navigateMock.mockReset();
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

describe('Payment — checkout de cartão (gateway Asaas)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    criarPagamentoMock.mockReset();
    syncPagamentoMock.mockReset();
    navigateMock.mockReset();
    window.sessionStorage.clear();
    syncPagamentoMock.mockRejectedValue(semPagamentoExistenteError());
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  async function selecionarCartao() {
    const cartaoTab = await screen.findByRole('button', { name: 'Cartão' });
    fireEvent.click(cartaoTab);
    return screen.findByRole('button', { name: /pagar com cartao/i });
  }

  it('redireciona para o link de pagamento retornado pelo backend (campo normalizado linkPagamento)', async () => {
    criarPagamentoMock.mockResolvedValue({
      pagamento: { id: 'pag-asaas-1', status: 'AGUARDANDO' },
      linkPagamento: 'https://sandbox.asaas.com/i/mock-invoice',
      asaas: { paymentId: 'pay_123', invoiceUrl: 'https://sandbox.asaas.com/i/mock-invoice' },
    });

    renderPayment();

    const pagarBtn = await selecionarCartao();
    await act(async () => { fireEvent.click(pagarBtn); });

    await waitFor(() => expect(window.location.href).toBe('https://sandbox.asaas.com/i/mock-invoice'));
  });

  it('usa asaas.invoiceUrl como alternativa quando linkPagamento não vem preenchido', async () => {
    criarPagamentoMock.mockResolvedValue({
      pagamento: { id: 'pag-asaas-2', status: 'AGUARDANDO' },
      asaas: { paymentId: 'pay_456', invoiceUrl: 'https://sandbox.asaas.com/i/outro-invoice' },
    });

    renderPayment();

    const pagarBtn = await selecionarCartao();
    await act(async () => { fireEvent.click(pagarBtn); });

    await waitFor(() => expect(window.location.href).toBe('https://sandbox.asaas.com/i/outro-invoice'));
  });

  it('exibe mensagem de erro quando o backend não retorna nenhum link de checkout', async () => {
    criarPagamentoMock.mockResolvedValue({
      pagamento: { id: 'pag-asaas-3', status: 'AGUARDANDO' },
    });

    renderPayment();

    const pagarBtn = await selecionarCartao();
    await act(async () => { fireEvent.click(pagarBtn); });

    expect(await screen.findByRole('alert')).toHaveTextContent(/não retornou link de pagamento/i);
    expect(window.location.href).toBe('');
  });
});
