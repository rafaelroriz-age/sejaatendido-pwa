import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { criarPagamento, syncPagamento } from '../services/api';

type PaymentMethod = 'pix' | 'cartao';

type PixData = {
  qrCode?: string;
  qrCodeBase64?: string | null;
  ticketUrl?: string | null;
  validade?: string;
};

type PaymentStatus = 'AGUARDANDO' | 'PAGO' | 'FALHOU' | 'CANCELADO' | string;

type PaymentResponse = {
  id?: string;
  status?: PaymentStatus;
  pagamento?: {
    id?: string;
    status?: PaymentStatus;
    valor?: number;
  };
  pix?: PixData;
  mercadopago?: {
    initPoint?: string;
    preferenceId?: string;
  };
};

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

function getErrorMessage(error: unknown, fallback: string): string {
  const anyErr = error as any;
  const payload = anyErr?.response?.data;
  return (
    payload?.erro ||
    payload?.mensagem ||
    payload?.message ||
    anyErr?.message ||
    fallback
  );
}

function normalizeStatus(data: PaymentResponse | null): PaymentStatus {
  if (!data) return 'AGUARDANDO';
  return data.pagamento?.status || data.status || 'AGUARDANDO';
}

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();

  const state = (location.state as { consultaId?: string; valor?: number } | null) || null;
  const consultaIdFromQuery = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('consultaId') ?? undefined;
  }, [location.search]);

  const persistedConsultaId =
    typeof window !== 'undefined'
      ? window.sessionStorage.getItem('sejaatendido:lastConsultaId') ?? undefined
      : undefined;

  const consultaId = state?.consultaId ?? consultaIdFromQuery ?? persistedConsultaId;

  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<PaymentStatus>('AGUARDANDO');
  const [paymentData, setPaymentData] = useState<PaymentResponse | null>(null);
  const [errorText, setErrorText] = useState('');
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAt = useRef<number | null>(null);

  useEffect(() => {
    if (consultaId && typeof window !== 'undefined') {
      window.sessionStorage.setItem('sejaatendido:lastConsultaId', consultaId);
    }
  }, [consultaId]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    setPaymentData(null);
    setStatus('AGUARDANDO');
    setErrorText('');
    setExpired(false);
    setCopied(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [method]);

  useEffect(() => {
    const validade = paymentData?.pix?.validade;
    if (!validade) return;

    const expirationTs = new Date(validade).getTime();
    if (Number.isNaN(expirationTs)) return;

    const updateExpiration = () => {
      if (Date.now() >= expirationTs) {
        setExpired(true);
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }
    };

    updateExpiration();
    const id = setInterval(updateExpiration, 1000);
    return () => clearInterval(id);
  }, [paymentData?.pix?.validade]);

  async function handleCopyPixCode() {
    const qr = paymentData?.pix?.qrCode;
    if (!qr) return;
    try {
      await navigator.clipboard.writeText(qr);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setErrorText('Não foi possível copiar o código PIX automaticamente.');
    }
  }

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(currentConsultaId: string) {
    stopPolling();
    pollStartedAt.current = Date.now();

    pollRef.current = setInterval(async () => {
      try {
        const sync = await syncPagamento(currentConsultaId);
        const nextStatus = normalizeStatus(sync as PaymentResponse);
        setStatus(nextStatus);

        if (nextStatus === 'PAGO') {
          stopPolling();
          navigate('/dashboard', {
            replace: true,
            state: { paymentSuccess: true, consultaId: currentConsultaId },
          });
          return;
        }

        if (nextStatus !== 'AGUARDANDO') {
          stopPolling();
          return;
        }

        const startedAt = pollStartedAt.current ?? Date.now();
        if (Date.now() - startedAt >= POLL_TIMEOUT_MS) {
          stopPolling();
          setExpired(true);
        }
      } catch {
        // Silent polling errors to avoid interrupting checkout UI.
      }
    }, POLL_INTERVAL_MS);
  }

  async function createPixPayment() {
    if (!consultaId) {
      setErrorText('ID da consulta não encontrado.');
      return;
    }

    setLoading(true);
    setErrorText('');

    try {
      const data = (await criarPagamento({ consultaId, metodoPagamento: 'pix' })) as PaymentResponse;

      const hasPixFields = Boolean(data?.pix?.qrCode || data?.pix?.qrCodeBase64 || data?.pix?.ticketUrl);
      if (!hasPixFields) {
        setErrorText('Resposta de PIX inválida: QR Code não retornado pelo backend.');
        return;
      }

      setPaymentData(data);
      setStatus(normalizeStatus(data));
      setExpired(false);
      startPolling(consultaId);
    } catch (error) {
      const message = getErrorMessage(error, 'Falha ao gerar pagamento PIX.');
      setErrorText(message);
      window.alert(`Erro ao gerar pagamento PIX\n${message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleCardPayment() {
    if (!consultaId) {
      setErrorText('ID da consulta não encontrado.');
      return;
    }

    setLoading(true);
    setErrorText('');
    try {
      const data = (await criarPagamento({ consultaId, metodoPagamento: 'card' })) as PaymentResponse;
      const initPoint = data?.mercadopago?.initPoint;
      if (!initPoint) {
        setErrorText('Checkout do cartão não retornou link de pagamento.');
        return;
      }
      window.location.href = initPoint;
    } catch (error) {
      const message = getErrorMessage(error, 'Falha ao iniciar pagamento com cartão.');
      setErrorText(message);
      window.alert(`Erro ao iniciar pagamento\n${message}`);
    } finally {
      setLoading(false);
    }
  }

  const pix = paymentData?.pix;
  const validadeText = pix?.validade ? new Date(pix.validade).toLocaleString('pt-BR') : null;

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: 20 }}>
      <h1>Pagamento</h1>
      <p>
        Consulta: <strong>{consultaId || 'não encontrada'}</strong>
      </p>
      {typeof state?.valor === 'number' ? (
        <p>
          Valor: <strong>R$ {(state.valor / 100).toFixed(2)}</strong>
        </p>
      ) : null}

      <section style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => setMethod('pix')} disabled={loading || method === 'pix'}>
          PIX
        </button>
        <button type="button" onClick={() => setMethod('cartao')} disabled={loading || method === 'cartao'}>
          Cartão
        </button>
      </section>

      {method === 'pix' ? (
        <section>
          <button type="button" onClick={createPixPayment} disabled={loading || !consultaId}>
            {loading ? 'Gerando PIX...' : 'Pagar via PIX'}
          </button>

          {errorText ? (
            <p style={{ color: '#B00020', marginTop: 12 }} role="alert">
              {errorText}
            </p>
          ) : null}

          {pix ? (
            <div style={{ marginTop: 16, display: 'grid', gap: 10 }}>
              <p>
                Status: <strong>{status}</strong>
              </p>

              {validadeText ? (
                <p>
                  Válido até: <strong>{validadeText}</strong>
                </p>
              ) : null}

              {pix.qrCodeBase64 ? (
                <img
                  src={`data:image/png;base64,${pix.qrCodeBase64}`}
                  alt="QR Code PIX"
                  style={{ width: 260, height: 260, objectFit: 'contain' }}
                />
              ) : null}

              {pix.qrCode ? (
                <>
                  <label htmlFor="pix-code">Código PIX copia e cola</label>
                  <input
                    id="pix-code"
                    readOnly
                    value={pix.qrCode}
                    style={{ width: '100%', padding: 8 }}
                  />
                  <button type="button" onClick={handleCopyPixCode}>
                    {copied ? 'Código copiado' : 'Copiar código PIX'}
                  </button>
                </>
              ) : null}

              {pix.ticketUrl ? (
                <a href={pix.ticketUrl} target="_blank" rel="noreferrer">
                  Pagar pelo Mercado Pago
                </a>
              ) : null}

              {expired ? (
                <button type="button" onClick={createPixPayment} disabled={loading}>
                  Gerar novo código PIX
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : (
        <section>
          <button type="button" onClick={handleCardPayment} disabled={loading || !consultaId}>
            {loading ? 'Iniciando checkout...' : 'Pagar com cartão'}
          </button>
          {errorText ? (
            <p style={{ color: '#B00020', marginTop: 12 }} role="alert">
              {errorText}
            </p>
          ) : null}
        </section>
      )}
    </main>
  );
}
