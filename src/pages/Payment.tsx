import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { criarPagamento, syncPagamento } from '../services/api';
import Colors, { Radius } from '../theme/colors';

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
    sandboxInitPoint?: string;
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
  // pagamento.status is the canonical field per backend contract ("PAGO", "PENDENTE", etc.)
  return data.pagamento?.status || data.status || 'AGUARDANDO';
}

function isPendingStatus(status: PaymentStatus): boolean {
  const normalized = String(status || '').toUpperCase();
  return normalized === 'AGUARDANDO' || normalized === 'PENDENTE';
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

        if (!isPendingStatus(nextStatus)) {
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
      const data = (await criarPagamento({ consultaId, metodoPagamento: 'pix', valorCentavos: state?.valor })) as PaymentResponse;

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
      const data = (await criarPagamento({ consultaId, metodoPagamento: 'card', valorCentavos: state?.valor })) as PaymentResponse;
      const checkoutUrl = import.meta.env.PROD
        ? data?.mercadopago?.initPoint
        : data?.mercadopago?.sandboxInitPoint || data?.mercadopago?.initPoint;
      if (!checkoutUrl) {
        setErrorText('Checkout do cartão não retornou link de pagamento.');
        return;
      }
      window.location.href = checkoutUrl;
    } catch (error) {
      const message = getErrorMessage(error, 'Falha ao iniciar pagamento com cartão.');
      setErrorText(message);
    } finally {
      setLoading(false);
    }
  }

  const pix = paymentData?.pix;
  const validadeText = pix?.validade ? new Date(pix.validade).toLocaleString('pt-BR') : null;

  const btnBase: React.CSSProperties = {
    flex: 1, padding: '13px 0', border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: 15, borderRadius: Radius.md, transition: 'all 0.18s',
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Pagamento</span>
        <div style={{ width: 50 }} />
      </div>

      <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
        {/* Consulta info */}
        {consultaId && (
          <div style={{ backgroundColor: Colors.card, borderRadius: 16, padding: '14px 16px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: Colors.textMuted, fontWeight: 600 }}>Consulta</span>
            <span style={{ fontSize: 13, color: Colors.textPrimary, fontFamily: 'monospace', fontWeight: 700 }}>{consultaId.slice(0, 12)}…</span>
          </div>
        )}
        {typeof state?.valor === 'number' && (
          <div style={{ backgroundColor: Colors.card, borderRadius: 16, padding: '14px 16px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 15, color: Colors.textSecondary, fontWeight: 600 }}>Valor</span>
            <span style={{ fontSize: 20, fontWeight: 900, color: Colors.primary }}>R$ {(state.valor / 100).toFixed(2)}</span>
          </div>
        )}

        {/* Method selector */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {(['pix', 'cartao'] as const).map(m => (
            <button key={m} type="button" onClick={() => setMethod(m)} disabled={loading || method === m} style={{
              ...btnBase,
              backgroundColor: method === m ? Colors.primary : Colors.card,
              color: method === m ? '#fff' : Colors.textSecondary,
              boxShadow: method === m ? `0 4px 10px ${Colors.primary}59` : '0 2px 6px rgba(0,0,0,0.06)',
            }}>
              {m === 'pix' ? 'PIX' : 'Cartão'}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {errorText && (
          <div style={{ backgroundColor: '#FFEBEE', borderRadius: 12, padding: '12px 16px', marginBottom: 16, border: '1px solid #EF9A9A' }}>
            <span style={{ fontSize: 14, color: '#C62828', fontWeight: 600 }} role="alert">{errorText}</span>
          </div>
        )}

        {method === 'pix' ? (
          <>
            {!paymentData && (
              <button type="button" onClick={createPixPayment} disabled={loading || !consultaId} style={{
                width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18,
                border: 'none', cursor: (loading || !consultaId) ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: 16, fontWeight: 700, opacity: (loading || !consultaId) ? 0.6 : 1,
                boxShadow: `0 6px 12px ${Colors.primary}59`,
              }}>
                {loading ? 'Gerando PIX…' : 'Gerar código PIX'}
              </button>
            )}

            {pix && (
              <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 24, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: 13, color: Colors.textMuted, fontWeight: 600 }}>Status</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: status === 'PAGO' ? Colors.success : Colors.primary }}>{status}</span>
                </div>
                {validadeText && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%' }}>
                    <span style={{ fontSize: 13, color: Colors.textMuted, fontWeight: 600 }}>Válido até</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: expired ? Colors.error : Colors.textPrimary }}>{validadeText}</span>
                  </div>
                )}

                {pix.qrCodeBase64 && (
                  <img src={`data:image/png;base64,${pix.qrCodeBase64}`} alt="QR Code PIX" style={{ width: 220, height: 220, objectFit: 'contain', borderRadius: 12 }} />
                )}

                {pix.qrCode && (
                  <div style={{ width: '100%' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, marginBottom: 8 }}>Código copia e cola</p>
                    <div style={{ backgroundColor: Colors.inputBg, borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 8, border: `1px solid ${Colors.border}` }}>
                      <span style={{ flex: 1, fontSize: 12, color: Colors.textPrimary, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pix.qrCode}</span>
                      <button type="button" onClick={handleCopyPixCode} style={{ backgroundColor: copied ? Colors.success : Colors.primary, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 12px', fontWeight: 700, fontSize: 12, cursor: 'pointer', flexShrink: 0 }}>
                        {copied ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                )}

                {pix.ticketUrl && (
                  <a href={pix.ticketUrl} target="_blank" rel="noreferrer" style={{ width: '100%', textAlign: 'center', backgroundColor: '#00B3FF22', color: '#0077AA', borderRadius: 12, padding: '14px 0', display: 'block', fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
                    Pagar pelo Mercado Pago ↗
                  </a>
                )}

                {expired && (
                  <button type="button" onClick={createPixPayment} disabled={loading} style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 16, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 15 }}>
                    Gerar novo código PIX
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <button type="button" onClick={handleCardPayment} disabled={loading || !consultaId} style={{
            width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18,
            border: 'none', cursor: (loading || !consultaId) ? 'not-allowed' : 'pointer',
            color: '#fff', fontSize: 16, fontWeight: 700, opacity: (loading || !consultaId) ? 0.6 : 1,
            boxShadow: `0 6px 12px ${Colors.primary}59`,
          }}>
            {loading ? 'Iniciando checkout…' : 'Pagar com cartão'}
          </button>
        )}
      </div>
    </div>
  );
}
