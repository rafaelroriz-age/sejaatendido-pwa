import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { criarPagamento, syncPagamento } from '../services/api';
import { getUser } from '../storage/localStorage';
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
  /** Campos ja normalizados por services/api.ts, independentes do gateway atual (Asaas). */
  linkPagamento?: string;
  paymentUrl?: string;
  asaas?: {
    paymentId?: string;
    invoiceUrl?: string;
    checkoutUrl?: string;
    billingType?: string;
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

// Backend so cria pagamento quando consulta.status === 'CONCLUIDA' (regra de
// negocio pos-atendimento). Antes disso a API responde 400/403 com mensagem
// especifica; tratamos esse caso separado de um erro generico.
function isConsultaNaoConcluidaError(error: unknown): boolean {
  const anyErr = error as any;
  const status = anyErr?.response?.status;
  if (status !== 400 && status !== 403) return false;
  const payload = anyErr?.response?.data;
  const msg = String(payload?.erro ?? payload?.mensagem ?? payload?.message ?? '').toLowerCase();
  return msg.includes('conclu') || msg.includes('finaliz');
}

// Sem CPF cadastrado o backend responde 422 antes de chamar o gateway Asaas
// (correcao aplicada no backend em 2026-07-30). Tratamos separado do erro
// generico para orientar o paciente a completar o cadastro, em vez de expor
// o texto tecnico da API.
function isCpfObrigatorioError(error: unknown): boolean {
  const anyErr = error as any;
  if (anyErr?.response?.status !== 422) return false;
  const payload = anyErr?.response?.data;
  const msg = String(payload?.erro ?? payload?.mensagem ?? payload?.message ?? '').toLowerCase();
  return msg.includes('cpf');
}

function isConsultaJaPagaError(error: unknown): boolean {
  return (error as any)?.response?.status === 409;
}

// 403 tambem e usado pelo backend para "consulta ainda nao concluida" (ver
// isConsultaNaoConcluidaError); aqui cobrimos o outro caso de 403: consulta
// pertence a outro paciente. Bloqueia o acesso a tela inteira.
function isAcessoNegadoError(error: unknown): boolean {
  const anyErr = error as any;
  if (anyErr?.response?.status !== 403) return false;
  return !isConsultaNaoConcluidaError(error);
}

type BlockedReason = 'consulta_nao_concluida' | 'cpf_obrigatorio' | 'consulta_ja_paga' | 'acesso_negado';

// Classifica os erros conhecidos do fluxo de pagamento (ver tabela de casos de
// erro do checklist de validacao) em um blockedReason + mensagem amigavel, sem
// expor o texto tecnico cru da API ao paciente.
function classifyPaymentError(error: unknown, fallback: string): { blockedReason: BlockedReason | null; message: string } {
  if (isCpfObrigatorioError(error)) {
    return {
      blockedReason: 'cpf_obrigatorio',
      message: 'Para pagar, complete seu cadastro com CPF.',
    };
  }
  if (isConsultaJaPagaError(error)) {
    return { blockedReason: 'consulta_ja_paga', message: 'Esta consulta já foi paga.' };
  }
  if (isAcessoNegadoError(error)) {
    return {
      blockedReason: 'acesso_negado',
      message: 'Você não tem permissão para acessar o pagamento desta consulta.',
    };
  }
  if (isConsultaNaoConcluidaError(error)) {
    return {
      blockedReason: 'consulta_nao_concluida',
      message: 'O pagamento só é liberado depois que a consulta é marcada como concluída. Isso costuma levar alguns minutos após o horário marcado — volte ao painel, que o botão de pagamento aparece automaticamente.',
    };
  }
  return { blockedReason: null, message: getErrorMessage(error, fallback) };
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
  // pixExpired: o QR/codigo copia-e-cola realmente venceu (campo `validade`).
  // pollTimedOut: o polling automatico desistiu (10min) mas o pagamento pode
  // ainda estar valido no gateway de pagamento — nesse caso oferecemos apenas
  // uma verificacao manual, para nao criar uma cobranca/QR duplicado.
  const [pixExpired, setPixExpired] = useState(false);
  const [pollTimedOut, setPollTimedOut] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [manualChecking, setManualChecking] = useState(false);
  const [blockedReason, setBlockedReason] = useState<
    'consulta_nao_concluida' | 'cpf_obrigatorio' | 'consulta_ja_paga' | 'acesso_negado' | null
  >(null);
  // Paciente sem CPF cadastrado: bloqueia o botao de pagar proativamente, antes
  // de tentar criar o pagamento e receber o 422 do backend.
  const [patientCpfMissing, setPatientCpfMissing] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartedAt = useRef<number | null>(null);
  // Guarda contra duplo-clique/duplo-submit alem do `disabled` do botao: o
  // `disabled` so reflete o novo estado no proximo render, e dois cliques muito
  // rapidos (ou eventos duplicados) poderiam disparar duas chamadas de criacao
  // de pagamento antes disso — o que geraria duas preferences/QR distintos.
  const submittingRef = useRef(false);

  useEffect(() => {
    if (consultaId && typeof window !== 'undefined') {
      window.sessionStorage.setItem('sejaatendido:lastConsultaId', consultaId);
    }
  }, [consultaId]);

  useEffect(() => {
    let active = true;
    async function checkPatientCpf() {
      const user = await getUser();
      if (!active) return;
      setPatientCpfMissing(user?.tipo === 'PACIENTE' && !user.cpf);
    }
    void checkPatientCpf();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    setPaymentData(null);
    setStatus('AGUARDANDO');
    setErrorText('');
    setPixExpired(false);
    setPollTimedOut(false);
    setBlockedReason(null);
    setCopied(false);
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, [method]);

  // Ao entrar na tela (ou trocar de consulta), verifica se ja existe um
  // pagamento em AGUARDANDO para essa consulta antes de oferecer "Gerar PIX"/
  // "Pagar com cartao". Isso evita criar uma preference/QR duplicada quando o
  // usuario recarrega a pagina ou volta para a tela de pagamento.
  useEffect(() => {
    let active = true;

    async function resumeExistingPayment() {
      if (!consultaId) return;
      setCheckingExisting(true);
      try {
        const sync = await syncPagamento(consultaId);
        if (!active) return;
        const nextStatus = normalizeStatus(sync as PaymentResponse);

        if (nextStatus === 'PAGO') {
          navigate('/dashboard', { replace: true, state: { paymentSuccess: true, consultaId } });
          return;
        }

        if (isPendingStatus(nextStatus)) {
          const hasPixFields = Boolean(sync?.pix?.qrCode || sync?.pix?.qrCodeBase64 || sync?.pix?.ticketUrl);
          if (hasPixFields) {
            setMethod('pix');
            setPaymentData(sync as PaymentResponse);
            setStatus(nextStatus);
            startPolling(consultaId);
          }
        }
      } catch (error) {
        if (isAcessoNegadoError(error)) {
          setBlockedReason('acesso_negado');
          setErrorText('Você não tem permissão para acessar o pagamento desta consulta.');
        }
        // Demais casos: sem pagamento existente ainda (ou falha transitoria na
        // verificacao) — segue o fluxo normal, deixando o usuario iniciar um
        // novo pagamento.
      } finally {
        if (active) setCheckingExisting(false);
      }
    }

    resumeExistingPayment();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consultaId]);

  useEffect(() => {
    const validade = paymentData?.pix?.validade;
    if (!validade) return;

    const expirationTs = new Date(validade).getTime();
    if (Number.isNaN(expirationTs)) return;

    const updateExpiration = () => {
      if (Date.now() >= expirationTs) {
        setPixExpired(true);
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
    setPollTimedOut(false);

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
          // O polling automatico desiste, mas o pagamento pode continuar valido
          // no gateway (webhook so demorou). Nao marcamos como "expirado":
          // isso evita oferecer "gerar novo QR" e criar uma cobranca duplicada.
          stopPolling();
          setPollTimedOut(true);
        }
      } catch {
        // Silent polling errors to avoid interrupting checkout UI.
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleManualCheck() {
    if (!consultaId || manualChecking) return;
    setManualChecking(true);
    setErrorText('');
    try {
      const sync = await syncPagamento(consultaId);
      const nextStatus = normalizeStatus(sync as PaymentResponse);
      setStatus(nextStatus);

      if (nextStatus === 'PAGO') {
        stopPolling();
        navigate('/dashboard', { replace: true, state: { paymentSuccess: true, consultaId } });
        return;
      }

      if (isPendingStatus(nextStatus)) {
        // Ainda pendente: retoma o polling automatico com uma nova janela de timeout.
        startPolling(consultaId);
      } else {
        stopPolling();
      }
    } catch (error) {
      setErrorText(getErrorMessage(error, 'Não foi possível verificar o pagamento agora. Tente novamente em instantes.'));
    } finally {
      setManualChecking(false);
    }
  }

  async function createPixPayment() {
    if (!consultaId) {
      setErrorText('ID da consulta não encontrado.');
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;

    setLoading(true);
    setErrorText('');
    setBlockedReason(null);

    try {
      const data = (await criarPagamento({ consultaId, metodoPagamento: 'pix', valorCentavos: state?.valor })) as PaymentResponse;

      const hasPixFields = Boolean(data?.pix?.qrCode || data?.pix?.qrCodeBase64 || data?.pix?.ticketUrl);
      if (!hasPixFields) {
        setErrorText('Resposta de PIX inválida: QR Code não retornado pelo backend.');
        return;
      }

      setPaymentData(data);
      setStatus(normalizeStatus(data));
      setPixExpired(false);
      startPolling(consultaId);
    } catch (error) {
      const { blockedReason: reason, message } = classifyPaymentError(error, 'Falha ao gerar pagamento PIX.');
      setBlockedReason(reason);
      setErrorText(message);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  async function handleCardPayment() {
    if (!consultaId) {
      setErrorText('ID da consulta não encontrado.');
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;

    setLoading(true);
    setErrorText('');
    setBlockedReason(null);
    try {
      const data = (await criarPagamento({ consultaId, metodoPagamento: 'card', valorCentavos: state?.valor })) as PaymentResponse;
      const checkoutUrl = data?.linkPagamento || data?.paymentUrl || data?.asaas?.invoiceUrl || data?.asaas?.checkoutUrl;
      if (!checkoutUrl) {
        setErrorText('Checkout do cartão não retornou link de pagamento.');
        return;
      }
      window.location.href = checkoutUrl;
    } catch (error) {
      const { blockedReason: reason, message } = classifyPaymentError(error, 'Falha ao iniciar pagamento com cartão.');
      setBlockedReason(reason);
      setErrorText(message);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }

  const pix = paymentData?.pix;
  const validadeText = pix?.validade ? new Date(pix.validade).toLocaleString('pt-BR') : null;

  // Consulta de outro paciente (403): bloqueia o acesso à tela inteira, sem
  // oferecer nenhuma opção de pagamento.
  if (blockedReason === 'acesso_negado') {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', flexDirection: 'column' }}>
        <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
          <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Pagamento</span>
          <div style={{ width: 50 }} />
        </div>
        <div style={{ flex: 1, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <p role="alert" style={{ fontSize: 15, color: Colors.error, fontWeight: 700, marginBottom: 16 }}>
              {errorText || 'Você não tem permissão para acessar o pagamento desta consulta.'}
            </p>
            <button type="button" onClick={() => navigate('/dashboard')} style={{ backgroundColor: Colors.primary, color: '#fff', border: 'none', borderRadius: Radius.md, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}>
              Voltar ao painel
            </button>
          </div>
        </div>
      </div>
    );
  }

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

        {/* CPF obrigatorio: bloqueia o pagamento (proativamente ou apos 422 do backend) ate o paciente completar o cadastro. */}
        {(patientCpfMissing || blockedReason === 'cpf_obrigatorio') && (
          <div style={{ backgroundColor: Colors.warningLight, borderRadius: 12, padding: '12px 16px', marginBottom: 16, border: '1px solid #FFB74D' }}>
            {!errorText && (
              <span style={{ fontSize: 14, color: '#E65100', fontWeight: 600, display: 'block', marginBottom: 10 }}>
                Para pagar, complete seu cadastro com CPF.
              </span>
            )}
            <button type="button" onClick={() => navigate('/profile')} style={{ backgroundColor: '#E65100', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
              Completar cadastro
            </button>
          </div>
        )}

        {/* Consulta ja paga: nada mais a fazer, so voltar ao painel. */}
        {blockedReason === 'consulta_ja_paga' && (
          <button type="button" onClick={() => navigate('/dashboard')} style={{
            width: '100%', backgroundColor: Colors.card, borderRadius: Radius.md, padding: 16,
            border: `1px solid ${Colors.border}`, cursor: 'pointer',
            color: Colors.textSecondary, fontSize: 15, fontWeight: 700, marginBottom: 16,
          }}>
            Voltar ao painel
          </button>
        )}

        {method === 'pix' ? (
          <>
            {checkingExisting && !paymentData && (
              <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 13, color: Colors.textMuted, fontWeight: 600 }}>
                Verificando se já existe um pagamento em andamento…
              </div>
            )}

            {!paymentData && !checkingExisting && blockedReason !== 'consulta_nao_concluida' && blockedReason !== 'consulta_ja_paga' && (
              <button type="button" onClick={createPixPayment} disabled={loading || !consultaId || patientCpfMissing} style={{
                width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18,
                border: 'none', cursor: (loading || !consultaId || patientCpfMissing) ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: 16, fontWeight: 700, opacity: (loading || !consultaId || patientCpfMissing) ? 0.6 : 1,
                boxShadow: `0 6px 12px ${Colors.primary}59`,
              }}>
                {loading ? 'Gerando PIX…' : 'Gerar código PIX'}
              </button>
            )}

            {blockedReason === 'consulta_nao_concluida' && !paymentData && (
              <button type="button" onClick={createPixPayment} disabled={loading} style={{
                width: '100%', backgroundColor: Colors.card, borderRadius: Radius.md, padding: 16,
                border: `1px solid ${Colors.border}`, cursor: loading ? 'not-allowed' : 'pointer',
                color: Colors.textSecondary, fontSize: 15, fontWeight: 700,
              }}>
                {loading ? 'Verificando…' : 'Tentar novamente'}
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
                    <span style={{ fontSize: 13, fontWeight: 700, color: pixExpired ? Colors.error : Colors.textPrimary }}>{validadeText}</span>
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
                    Abrir link de pagamento ↗
                  </a>
                )}

                {pollTimedOut && !pixExpired && (
                  <div style={{ width: '100%', textAlign: 'center' }}>
                    <p style={{ fontSize: 12, color: Colors.textMuted, marginBottom: 8 }}>
                      Ainda não recebemos a confirmação do pagamento. Isso pode levar alguns minutos — você pode continuar aguardando ou verificar manualmente.
                    </p>
                    <button type="button" onClick={handleManualCheck} disabled={manualChecking} style={{ width: '100%', backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14, border: `1px solid ${Colors.border}`, cursor: manualChecking ? 'not-allowed' : 'pointer', color: Colors.textPrimary, fontWeight: 700, fontSize: 14 }}>
                      {manualChecking ? 'Verificando…' : 'Verificar pagamento agora'}
                    </button>
                  </div>
                )}

                {pixExpired && (
                  <button type="button" onClick={createPixPayment} disabled={loading} style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 16, border: 'none', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 15 }}>
                    Gerar novo código PIX
                  </button>
                )}

                {!pollTimedOut && !pixExpired && isPendingStatus(status) && (
                  <button type="button" onClick={handleManualCheck} disabled={manualChecking} style={{ width: '100%', backgroundColor: 'transparent', borderRadius: Radius.md, padding: 12, border: 'none', cursor: manualChecking ? 'not-allowed' : 'pointer', color: Colors.textSecondary, fontWeight: 600, fontSize: 13, textDecoration: 'underline' }}>
                    {manualChecking ? 'Verificando…' : 'Já paguei / verificar agora'}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
            <>
              <div style={{ backgroundColor: Colors.card, borderRadius: 14, border: `1px solid ${Colors.border}`, padding: 14, marginBottom: 12 }}>
                <span style={{ fontSize: 13, color: Colors.textSecondary }}>
                  Você será redirecionado para o checkout seguro para inserir os dados do cartão. Cartão salvo ainda não está disponível neste método de pagamento.
                </span>
              </div>

              <button type="button" onClick={handleCardPayment} disabled={loading || !consultaId || Boolean(blockedReason) || patientCpfMissing} style={{
            width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18,
                border: 'none', cursor: (loading || !consultaId) ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: 16, fontWeight: 700, opacity: (loading || !consultaId || Boolean(blockedReason) || patientCpfMissing) ? 0.6 : 1,
            boxShadow: `0 6px 12px ${Colors.primary}59`,
          }}>
                {loading ? 'Iniciando checkout…' : 'Pagar com cartao'}
              </button>
            </>
        )}
      </div>
    </div>
  );
}
