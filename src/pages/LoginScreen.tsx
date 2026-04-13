import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, loginGoogleRequest } from '../services/api';
import { saveAuthSession } from '../storage/localStorage';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const LOGO_URL = `${import.meta.env.BASE_URL}logo-oficial.png`;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

export default function LoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const navigateByRole = useCallback((tipo: string) => {
    switch (tipo) {
      case 'ADMIN': navigate('/admin', { replace: true }); break;
      case 'MEDICO': navigate('/doctor', { replace: true }); break;
      case 'PACIENTE': navigate('/dashboard', { replace: true }); break;
      default: navigate('/home', { replace: true });
    }
  }, [navigate]);

  async function handleLogin() {
    if (!email || !senha) { window.alert('Preencha email e senha'); return; }
    setLoading(true);
    try {
      const { token, usuario, refreshToken } = await loginRequest({ email, senha });
      await saveAuthSession(token, usuario, refreshToken);
      navigateByRole(usuario.tipo);
    } catch (error) {
      showErrorAlert(error, 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current) return;

    function tryRender() {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return false;

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response: { credential: string }) => {
          setLoading(true);
          try {
            const { token, usuario, refreshToken } = await loginGoogleRequest(response.credential);
            await saveAuthSession(token, usuario, refreshToken);
            navigateByRole(usuario.tipo);
          } catch (error) {
            showErrorAlert(error, 'Erro ao fazer login com Google');
          } finally {
            setLoading(false);
          }
        },
      });

      window.google.accounts.id.renderButton(googleBtnRef.current, {
        type: 'standard',
        shape: 'rectangular',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: googleBtnRef.current.offsetWidth,
        locale: 'pt-BR',
      });
      return true;
    }

    if (!tryRender()) {
      const interval = setInterval(() => {
        if (tryRender()) clearInterval(interval);
      }, 200);
      return () => clearInterval(interval);
    }
  }, [navigateByRole]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <img
            src={LOGO_URL}
            alt="Seja Atendido"
            style={{ width: '100%', maxHeight: 160, objectFit: 'contain', marginBottom: 8 }}
          />
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
              autoComplete="email"
              aria-label="Email"
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
              autoComplete="current-password"
              aria-label="Senha"
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
              boxShadow: '0 6px 12px rgba(255, 51, 102, 0.35)',
            }}
          >
            {loading
              ? <div className="spinner" />
              : <span style={{ color: '#fff', fontSize: Font.md + 1, fontWeight: 700, letterSpacing: 0.5 }}>Entrar</span>
            }
          </button>

          {GOOGLE_CLIENT_ID && (
            <>
              <div style={{
                display: 'flex', alignItems: 'center', margin: `${Space.lg}px 0`,
                gap: 12,
              }}>
                <div style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
                <span style={{ fontSize: Font.sm - 1, color: Colors.textSecondary }}>ou</span>
                <div style={{ flex: 1, height: 1, backgroundColor: Colors.border }} />
              </div>
              <div ref={googleBtnRef} style={{ width: '100%' }} />
            </>
          )}
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
