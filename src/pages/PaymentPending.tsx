import { useNavigate, useSearchParams } from 'react-router-dom';
import Colors, { Radius } from '../theme/colors';

export default function PaymentPending() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const paymentId = params.get('payment_id') ?? params.get('collection_id');
  const merchantOrderId = params.get('merchant_order_id');
  const externalReference = params.get('external_reference');

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', flexDirection: 'column' }}>
      <div style={{ backgroundColor: Colors.primary, padding: '28px 16px 16px', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <span style={{ color: '#fff', fontSize: 18, fontWeight: 800 }}>Pagamento Pendente</span>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 32, width: '100%', maxWidth: 400, textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFF8E1', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <span style={{ fontSize: 40 }}>⏳</span>
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 900, color: Colors.textPrimary, marginBottom: 8 }}>
            Pagamento Pendente
          </h1>
          <p style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: '22px', marginBottom: 16 }}>
            Seu pagamento está aguardando confirmação. Isso pode ocorrer em pagamentos via boleto ou em meios de pagamento presenciais.
          </p>

          <div style={{ backgroundColor: '#FFF8E1', borderRadius: 12, padding: 16, marginBottom: 24, border: '1px solid #FFD54F', textAlign: 'left' }}>
            <p style={{ fontSize: 14, color: '#795548', lineHeight: '20px', margin: 0 }}>
              Após realizar o pagamento no estabelecimento indicado, aguarde a confirmação automática. Você receberá uma notificação quando o status for atualizado.
            </p>
          </div>

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
            onClick={() => navigate('/dashboard')}
            style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 18, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 16, fontWeight: 700, boxShadow: `0 6px 12px ${Colors.primary}59` }}
          >
            Ir para o Painel
          </button>
        </div>
      </div>
    </div>
  );
}
