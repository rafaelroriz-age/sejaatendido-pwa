import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest } from '../services/api';
import { saveAuthSession } from '../storage/localStorage';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !senha) { window.alert('Preencha email e senha'); return; }
    setLoading(true);
    try {
      const { token, usuario, refreshToken } = await loginRequest({ email, senha });
      await saveAuthSession(token, usuario, refreshToken);
      switch (usuario.tipo) {
        case 'ADMIN': navigate('/admin', { replace: true }); break;
        case 'MEDICO': navigate('/doctor', { replace: true }); break;
        default: navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      showErrorAlert(error, 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primary,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12,
          }}>
            <span style={{ color: '#fff', fontSize: 28, fontWeight: 800 }}>SA</span>
          </div>
          <h1 style={{ fontSize: Font.xl, fontWeight: 800, color: Colors.textPrimary, marginBottom: 4 }}>Seja Atendido</h1>
          <p style={{ fontSize: Font.sm, color: Colors.textSecondary, marginBottom: Space.xxl, letterSpacing: 0.3 }}>Acesse sua conta</p>
        </div>

        <div style={{
          backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Space.xl,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={{
            backgroundColor: Colors.inputBg, borderRadius: Radius.md,
            marginBottom: Space.md + 2, border: `1px solid ${Colors.border}`,
          }}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
              style={{
                width: '100%', padding: Space.lg, fontSize: Font.md,
                color: Colors.textPrimary, backgroundColor: 'transparent',
                border: 'none', outline: 'none',
              }}
            />
          </div>

          <div style={{
            backgroundColor: Colors.inputBg, borderRadius: Radius.md,
            marginBottom: Space.md + 2, border: `1px solid ${Colors.border}`,
          }}>
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              disabled={loading}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: Space.lg, fontSize: Font.md,
                color: Colors.textPrimary, backgroundColor: 'transparent',
                border: 'none', outline: 'none',
              }}
            />
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md,
              padding: Space.lg, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: Space.sm, opacity: loading ? 0.6 : 1,
              boxShadow: `0 6px 12px ${Colors.primary}59`,
            }}
          >
            {loading
              ? <div className="spinner" />
              : <span style={{ color: '#fff', fontSize: Font.md + 1, fontWeight: 700, letterSpacing: 0.5 }}>Entrar</span>
            }
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: Space.xl }}>
          <span style={{ fontSize: Font.sm - 1, color: Colors.textSecondary }}>
            Não tem conta?{' '}
            <span
              onClick={() => navigate('/signup')}
              style={{ color: Colors.primary, fontWeight: 700, cursor: 'pointer' }}
            >
              Cadastre-se
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}
