import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { confirmEmailRequest } from '../services/api';
import Colors from '../theme/colors';

type Status = 'loading' | 'success' | 'error';

export default function ConfirmEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (token) { doConfirm(); }
    else { setStatus('error'); setMessage('Token de confirmação não encontrado.'); }
  }, [token]);

  async function doConfirm() {
    setStatus('loading');
    try {
      await confirmEmailRequest(token);
      setStatus('success');
      setMessage('Seu email foi confirmado com sucesso!');
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.response?.data?.message || error?.response?.data?.error || 'Não foi possível confirmar o email. Tente novamente.');
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <div style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 36, textAlign: 'center', width: '100%', maxWidth: 380, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
        {status === 'loading' && (
          <>
            <div className="spinner" style={{ margin: '0 auto 20px' }} />
            <h2 style={{ fontSize: 22, fontWeight: 800, color: Colors.textPrimary, marginBottom: 10, letterSpacing: -0.3 }}>Confirmando email...</h2>
            <p style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: '22px' }}>Aguarde um momento</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.successLight, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: 36 }}>✓</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: Colors.textPrimary, marginBottom: 10, letterSpacing: -0.3 }}>Email Confirmado!</h2>
            <p style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: '22px', marginBottom: 24 }}>{message}</p>
            <button onClick={() => navigate('/login', { replace: true })} style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: 14, padding: 16, border: 'none', cursor: 'pointer', boxShadow: `0 4px 8px ${Colors.primary}4D` }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Ir para Login</span>
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <div style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.errorLight, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: 36 }}>✗</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: Colors.textPrimary, marginBottom: 10, letterSpacing: -0.3 }}>Erro na Confirmação</h2>
            <p style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: '22px', marginBottom: 24 }}>{message}</p>
            <button onClick={doConfirm} style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: 14, padding: 16, border: 'none', cursor: 'pointer', boxShadow: `0 4px 8px ${Colors.primary}4D` }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>Tentar Novamente</span>
            </button>
            <button onClick={() => navigate('/login', { replace: true })} style={{ background: 'none', border: 'none', marginTop: 16, padding: 8, cursor: 'pointer' }}>
              <span style={{ color: Colors.primary, fontSize: 15, fontWeight: 600 }}>Voltar para Login</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
