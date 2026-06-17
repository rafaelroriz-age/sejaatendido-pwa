import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { syncPagamento } from '../services/api';
import Colors, { Radius } from '../theme/colors';

export default function PaymentFailure() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const paymentId = params.get('payment_id') ?? params.get('collection_id');
  const merchantOrderId = params.get('merchant_order_id');
  const externalReference = params.get('external_reference');
  const queryString = params.toString();
  const consultaIdFromQuery = params.get('consultaId') ?? params.get('consulta_id');
  const consultaId = useMemo(() => consultaIdFromQuery ?? externalReference, [consultaIdFromQuery, externalReference]);

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string>('');

  useEffect(() => {
    let active = true;

    async function reconcilePaymentStatus() {
      if (!consultaId) return;
      try {
        const result = await syncPagamento(consultaId);
        if (!active) return;
        const nextStatus = (result?.status ?? '').toUpperCase();
        setSyncStatus(result?.status ?? null);

        if (nextStatus === 'PAGO') {
          navigate(`/payment/success${queryString ? `?${queryString}` : ''}`, { replace: true });
        }
      } catch {
        if (!active) return;
        setSyncError('Não foi possível sincronizar o status do pagamento agora.');
      }
    }

    reconcilePaymentStatus();

    return () => {
      active = false;
    };
  }, [consultaId, navigate, queryString]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Pagamento Não Realizado</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 32, width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFEBEE', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: 40 }}>✕</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 900, color: Colors.textPrimary, marginBottom: 8 }}>
            Pagamento Recusado
          </h1>
          <p style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: '22px', marginBottom: 24 }}>
            Seu pagamento não pôde ser processado. Verifique os dados do cartão ou tente outro método de pagamento.
          </p>

          {syncStatus && (
            <p style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12 }}>
              Última sincronização: <strong>{syncStatus}</strong>
            </p>
          )}

          {syncError && (
            <p style={{ fontSize: 13, color: '#B00020', marginBottom: 12 }} role="alert">
              {syncError}
            </p>
          )}

          {(paymentId || merchantOrderId || externalReference) && (
            <div style={{ backgroundColor: Colors.inputBg, borderRadius: 12, padding: 16, marginBottom: 24, textAlign: 'left' }}>
              {paymentId && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>ID do Pagamento</span>
                  <div style={{ fontSize: 14, color: Colors.textPrimary, fontFamily: 'monospace', marginTop: 2 }}>{paymentId}</div>
                </div>
              )}
              {merchantOrderId && (
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Nº do Pedido</span>
                  <div style={{ fontSize: 14, color: Colors.textPrimary, fontFamily: 'monospace', marginTop: 2 }}>{merchantOrderId}</div>
                </div>
              )}
              {externalReference && (
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Referência</span>
                  <div style={{ fontSize: 14, color: Colors.textPrimary, fontFamily: 'monospace', marginTop: 2 }}>{externalReference}</div>
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => navigate(-1)}
            style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16, fontWeight: 700, marginBottom: 12, boxShadow: `0 6px 12px ${Colors.primary}59` }}
          >
            Tentar Novamente
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ width: '100%', backgroundColor: 'transparent', borderRadius: Radius.md, padding: 16, border: `1px solid ${Colors.border}`, cursor: 'pointer', color: Colors.textSecondary, fontSize: 15, fontWeight: 600 }}
          >
            Voltar ao Painel
          </button>
        </div>
      </div>
    </div>
  );
}
