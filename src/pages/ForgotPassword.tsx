import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPasswordRequest } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) { window.alert('Informe seu email'); return; }
    setLoading(true);
    try {
      await forgotPasswordRequest(email.trim());
      setSent(true);
    } catch (error) {
      showErrorAlert(error, 'Erro ao solicitar recuperação de senha');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: Space.lg, fontSize: Font.md,
    color: Colors.textPrimary, backgroundColor: 'transparent',
    border: 'none', outline: 'none',
  };

  if (sent) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 36, textAlign: 'center', width: '100%', maxWidth: 380, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.successLight, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: 32 }}>📧</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: Colors.textPrimary, marginBottom: 8, letterSpacing: -0.3 }}>Email Enviado!</h2>
          <p style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: '22px', marginBottom: 24 }}>
            Se o email <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha. Verifique também a pasta de spam.
          </p>
          <button onClick={() => navigate('/login', { replace: true })} style={{
            width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Space.lg,
            border: 'none', cursor: 'pointer', boxShadow: `0 4px 8px ${Colors.primary}4D`,
          }}>
            <span style={{ color: '#fff', fontSize: Font.md, fontWeight: 700 }}>Voltar para Login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Space.xl, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: Space.xl }}>
            <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.accent, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 16px', fontSize: 32 }}>🔑</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: Colors.textPrimary, marginBottom: 8, letterSpacing: -0.3 }}>Esqueceu sua senha?</h2>
            <p style={{ fontSize: Font.sm, color: Colors.textSecondary, lineHeight: '20px' }}>
              Informe seu email e enviaremos um link para redefinir sua senha.
            </p>
          </div>

          <div style={{
            backgroundColor: Colors.inputBg, borderRadius: Radius.md,
            marginBottom: Space.lg, border: `1px solid ${Colors.border}`,
          }}>
            <input
              type="email"
              placeholder="Seu email cadastrado"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              aria-label="Email"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md,
              padding: Space.lg, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: loading ? 0.6 : 1, boxShadow: '0 6px 12px rgba(255, 51, 102, 0.35)',
            }}
          >
            {loading
              ? <div className="spinner" />
              : <span style={{ color: '#fff', fontSize: Font.md + 1, fontWeight: 700, letterSpacing: 0.5 }}>Enviar Link</span>
            }
          </button>

          <div style={{ textAlign: 'center', marginTop: Space.lg }}>
            <span
              onClick={() => navigate('/login')}
              style={{ color: Colors.primary, fontWeight: 600, cursor: 'pointer', fontSize: Font.sm }}
            >
              Voltar para Login
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
