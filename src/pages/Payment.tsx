import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wallet } from '@mercadopago/sdk-react';
import { criarPagamento, fetchPagamentoById, PagamentoResponse } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Radius } from '../theme/colors';

type PaymentMethod = 'pix' | 'mercadopago';

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { consultaId, valor } = (location.state as any) || {};
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [pagamento, setPagamento] = useState<PagamentoResponse | null>(null);
  const [status, setStatus] = useState('');
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  useEffect(() => { setPagamento(null); setPreferenceId(null); setStatus(''); }, [method]);

  const startPolling = useCallback((paymentId: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const data = await fetchPagamentoById(paymentId);
        if (data.status === 'APROVADO' || data.status === 'approved') {
          setStatus('APROVADO');
          if (pollRef.current) clearInterval(pollRef.current);
          window.alert('Pagamento Aprovado! Sua consulta foi confirmada.');
        }
      } catch {}
    }, 5000);
  }, []);

  async function handlePixPayment() {
    if (!consultaId) { window.alert('ID da consulta não encontrado'); return; }
    setLoading(true);
    try {
      const data = await criarPagamento({ consultaId, metodoPagamento: 'pix' });
      setPagamento(data); setStatus(data.status || 'PENDENTE'); startPolling(data.id);
    } catch (e) { showErrorAlert(e, 'Erro ao gerar pagamento PIX'); }
    finally { setLoading(false); }
  }

  async function handleMpPayment() {
    if (!consultaId) { window.alert('ID da consulta não encontrado'); return; }
    setLoading(true);
    try {
      const data = await criarPagamento({ consultaId, metodoPagamento: 'card' });
      setPagamento(data);
      const pid = data.mercadopago?.preferenceId ?? (data.pagamento as any)?.preferenceId;
      if (pid) {
        setPreferenceId(pid);
      } else if (data.linkPagamento || data.paymentUrl) {
        window.location.href = (data.linkPagamento || data.paymentUrl)!;
      }
    } catch (e) { showErrorAlert(e, 'Erro ao iniciar pagamento'); }
    finally { setLoading(false); }
  }

  function handleCopyPix() {
    const code = pagamento?.copiaCola || pagamento?.copiaECola || '';
    if (code) { navigator.clipboard.writeText(code); window.alert('Código PIX copiado!'); }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => navigate(-1)} style={{ color: '#fff', fontSize: 15, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>← Voltar</button>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Pagamento</span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ padding: 20 }}>
        <div style={{ backgroundColor: Colors.primary, borderRadius: 20, padding: 24, textAlign: 'center', marginBottom: 20, boxShadow: `0 6px 12px ${Colors.primary}4D` }}>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Valor da consulta</div>
          <div style={{ color: '#fff', fontSize: 36, fontWeight: 900, letterSpacing: -0.5 }}>R$ {valor ? Number(valor).toFixed(2) : '150,00'}</div>
        </div>

        <div style={{ display: 'flex', backgroundColor: Colors.card, borderRadius: 16, padding: 4, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
          {(['pix', 'mercadopago'] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              backgroundColor: method === m ? Colors.primary : 'transparent',
              color: method === m ? '#fff' : Colors.textSecondary, fontSize: 15, fontWeight: 700,
            }}>{m === 'pix' ? 'PIX' : 'Mercado Pago'}</button>
          ))}
        </div>

        {status === 'APROVADO' && (
          <div style={{ backgroundColor: Colors.successLight, borderRadius: 14, padding: 16, textAlign: 'center', marginBottom: 16, border: `1px solid ${Colors.success}` }}>
            <span style={{ color: Colors.success, fontSize: 16, fontWeight: 800 }}>Pagamento Aprovado!</span>
          </div>
        )}

        <div style={{ backgroundColor: Colors.card, borderRadius: 20, padding: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
          {method === 'pix' ? (
            !pagamento ? (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: Colors.textPrimary, marginBottom: 10 }}>Pagamento via PIX</h3>
                <p style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: '20px', marginBottom: 20 }}>Clique abaixo para gerar o código PIX. O pagamento é confirmado automaticamente.</p>
                <button onClick={handlePixPayment} disabled={loading} style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 12px ${Colors.primary}59` }}>
                  {loading ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Gerar PIX</span>}
                </button>
              </>
            ) : (
              <>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: Colors.textPrimary, marginBottom: 10 }}>PIX Gerado</h3>
                {(pagamento.qrCode || pagamento.qrCodeBase64) && (
                  <div style={{ backgroundColor: Colors.inputBg, borderRadius: 16, padding: 40, textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: Colors.textSecondary, marginBottom: 8 }}>QR Code</div>
                    <div style={{ fontSize: 13, color: Colors.textMuted }}>Escaneie com o app do seu banco</div>
                  </div>
                )}
                {(pagamento.copiaCola || pagamento.copiaECola) && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Código Copia e Cola:</div>
                    <div style={{ backgroundColor: Colors.inputBg, borderRadius: 12, padding: 14, marginBottom: 12, wordBreak: 'break-all', fontSize: 12, fontFamily: 'monospace', color: Colors.textPrimary }}>{pagamento.copiaCola || pagamento.copiaECola}</div>
                    <button onClick={handleCopyPix} style={{ width: '100%', backgroundColor: Colors.accent, borderRadius: 12, padding: 14, border: 'none', color: Colors.primary, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>Copiar Código</button>
                  </div>
                )}
                <p style={{ textAlign: 'center', color: Colors.textMuted, fontSize: 13 }}>Aguardando confirmação do pagamento...</p>
              </>
            )
          ) : (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: Colors.textPrimary, marginBottom: 10 }}>Pagar com Mercado Pago</h3>
              <p style={{ fontSize: 14, color: Colors.textSecondary, lineHeight: '20px', marginBottom: 20 }}>Você será redirecionado para o ambiente seguro do Mercado Pago para concluir o pagamento.</p>
              {!preferenceId ? (
                <button onClick={handleMpPayment} disabled={loading} style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 6px 12px ${Colors.primary}59` }}>
                  {loading ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Continuar para Pagamento</span>}
                </button>
              ) : (
                <div style={{ marginTop: 8 }}>
                  <Wallet
                    initialization={{ preferenceId }}
                    onError={(e) => { console.error('MP Wallet error', e); showErrorAlert(e, 'Erro no checkout Mercado Pago'); }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
