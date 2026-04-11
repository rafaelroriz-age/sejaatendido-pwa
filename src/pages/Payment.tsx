import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { criarPagamento, fetchPagamentoById, PagamentoResponse } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Radius } from '../theme/colors';

type PaymentMethod = 'pix' | 'cartao';

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { consultaId, valor } = (location.state as any) || {};
  const [method, setMethod] = useState<PaymentMethod>('pix');
  const [loading, setLoading] = useState(false);
  const [pagamento, setPagamento] = useState<PagamentoResponse | null>(null);
  const [status, setStatus] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

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

  async function handleCardPayment() {
    if (!consultaId) { window.alert('ID da consulta não encontrado'); return; }
    if (!cardNumber || !cardName || !cardExpiry || !cardCvv) { window.alert('Preencha todos os dados do cartão'); return; }
    setLoading(true);
    try {
      const data = await criarPagamento({ consultaId, metodoPagamento: 'card' });
      setPagamento(data);
      const url = data.linkPagamento || data.paymentUrl;
      if (url) window.open(url, '_blank');
      setStatus(data.status || 'PROCESSANDO'); startPolling(data.id);
    } catch (e) { showErrorAlert(e, 'Erro ao processar pagamento'); }
    finally { setLoading(false); }
  }

  function handleCopyPix() {
    const code = pagamento?.copiaCola || pagamento?.copiaECola || '';
    if (code) { navigator.clipboard.writeText(code); window.alert('Código PIX copiado!'); }
  }

  const inputStyle: React.CSSProperties = { width: '100%', backgroundColor: Colors.inputBg, borderRadius: 14, padding: 16, fontSize: 16, border: `1px solid ${Colors.border}`, color: Colors.textPrimary, outline: 'none' };

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
          {(['pix', 'cartao'] as const).map(m => (
            <button key={m} onClick={() => setMethod(m)} style={{
              flex: 1, padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
              backgroundColor: method === m ? Colors.primary : 'transparent',
              color: method === m ? '#fff' : Colors.textSecondary, fontSize: 15, fontWeight: 700,
            }}>{m === 'pix' ? 'PIX' : 'Cartão'}</button>
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
              <h3 style={{ fontSize: 18, fontWeight: 800, color: Colors.textPrimary, marginBottom: 10 }}>Dados do Cartão</h3>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Número do Cartão</label>
                <input value={cardNumber} onChange={e => setCardNumber(e.target.value)} placeholder="0000 0000 0000 0000" maxLength={19} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nome do Titular</label>
                <input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Como aparece no cartão" style={{ ...inputStyle, textTransform: 'uppercase' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>Validade</label>
                  <input value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} placeholder="MM/AA" maxLength={5} style={inputStyle} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 }}>CVV</label>
                  <input type="password" value={cardCvv} onChange={e => setCardCvv(e.target.value)} placeholder="000" maxLength={4} style={inputStyle} />
                </div>
              </div>
              <button onClick={handleCardPayment} disabled={loading} style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 20, boxShadow: `0 6px 12px ${Colors.primary}59` }}>
                {loading ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Pagar com Cartão</span>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
