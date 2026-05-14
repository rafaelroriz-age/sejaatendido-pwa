import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginRequest, loginCpfRequest, loginGoogleRequest } from '../services/api';
import { saveAuthSession } from '../storage/localStorage';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import axios from 'axios';

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
const _rawGoogleId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GOOGLE_CLIENT_ID = _rawGoogleId && _rawGoogleId.endsWith('.apps.googleusercontent.com') && !_rawGoogleId.startsWith('seu-') ? _rawGoogleId : undefined;

function applyCpfMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  if (rem !== parseInt(digits[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  rem = (sum * 10) % 11;
  if (rem === 10 || rem === 11) rem = 0;
  return rem === parseInt(digits[10]);
}

export default function LoginScreen() {
  const navigate = useNavigate();
  // 'paciente' uses email; 'medico' uses CPF
  const [mode, setMode] = useState<'paciente' | 'medico'>('paciente');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const navigateByRole = useCallback((tipo: string) => {
    switch (tipo) {
      case 'ADMIN': navigate('/admin', { replace: true }); break;
      case 'MEDICO': navigate('/doctor', { replace: true }); break;
      case 'PACIENTE': navigate('/dashboard', { replace: true }); break;
      default: navigate('/home', { replace: true });
    }
  }, [navigate]);

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    setCpf(applyCpfMask(e.target.value));
    setErrorMsg('');
  }

  async function handleLoginMedico() {
    setErrorMsg('');
    const rawCpf = cpf.replace(/\D/g, '');
    if (!rawCpf || !senha) { setErrorMsg('Preencha CPF e senha.'); return; }
    if (!isValidCpf(rawCpf)) { setErrorMsg('CPF inválido, verifique o número digitado.'); return; }
    setLoading(true);
    try {
      const { token, usuario, refreshToken } = await loginCpfRequest({ cpf: rawCpf, senha });
      const user = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        cpf: usuario.cpf,
        tipo: usuario.tipo,
        crmCartaoValidado: usuario.crmCartaoValidado,
        crmNumero: usuario.crmNumero,
        crmUf: usuario.crmUf,
      };
      await saveAuthSession(token, user, refreshToken);
      navigateByRole(usuario.tipo);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 400) { setErrorMsg('CPF inválido, verifique o número digitado.'); return; }
        if (status === 401) { setErrorMsg('CPF ou senha incorretos.'); return; }
        if (status === 403) {
          setErrorMsg('Seu CRM ainda não foi validado. Valide sua carteirinha na área de perfil.');
          return;
        }
      }
      showErrorAlert(error, 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  async function handleLoginPaciente() {
    setErrorMsg('');
    if (!email || !senha) { setErrorMsg('Preencha email e senha.'); return; }
    setLoading(true);
    try {
      const { token, usuario, refreshToken } = await loginRequest({ email, senha });
      const user = {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
      };
      await saveAuthSession(token, user, refreshToken);
      navigateByRole(usuario.tipo);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) { setErrorMsg('Email ou senha incorretos.'); return; }
      }
      showErrorAlert(error, 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit() {
    if (mode === 'medico') handleLoginMedico();
    else handleLoginPaciente();
  }

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !googleBtnRef.current || mode !== 'paciente') return;

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
  }, [navigateByRole, mode]);

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: Space.lg, fontSize: Font.md,
    color: Colors.textPrimary, backgroundColor: 'transparent',
    border: 'none', outline: 'none',
  };

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

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['paciente', 'medico'] as const).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setErrorMsg(''); }}
              style={{
                flex: 1, padding: '12px 8px', borderRadius: Radius.md,
                border: `2px solid ${mode === m ? Colors.primary : Colors.border}`,
                backgroundColor: mode === m ? Colors.accent : Colors.card,
                color: mode === m ? Colors.primary : Colors.textSecondary,
                fontWeight: 700, fontSize: Font.sm, cursor: 'pointer',
              }}
            >
              {m === 'paciente' ? '👤 Paciente / Admin' : '🩺 Médico (CPF)'}
            </button>
          ))}
        </div>

        <div style={{
          backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Space.xl,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}>
          {mode === 'medico' ? (
            <div style={{
              backgroundColor: Colors.inputBg, borderRadius: Radius.md,
              marginBottom: Space.md + 2, border: `1px solid ${Colors.border}`,
            }}>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="CPF (000.000.000-00)"
                value={cpf}
                onChange={handleCpfChange}
                disabled={loading}
                autoComplete="username"
                aria-label="CPF"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={inputStyle}
              />
            </div>
          ) : (
            <div style={{
              backgroundColor: Colors.inputBg, borderRadius: Radius.md,
              marginBottom: Space.md + 2, border: `1px solid ${Colors.border}`,
            }}>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
                disabled={loading}
                autoComplete="email"
                aria-label="Email"
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={inputStyle}
              />
            </div>
          )}

          <div style={{
            backgroundColor: Colors.inputBg, borderRadius: Radius.md,
            marginBottom: Space.md + 2, border: `1px solid ${Colors.border}`,
          }}>
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={e => { setSenha(e.target.value); setErrorMsg(''); }}
              disabled={loading}
              autoComplete="current-password"
              aria-label="Senha"
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              style={inputStyle}
            />
          </div>

          {errorMsg && (
            <div style={{
              backgroundColor: Colors.errorLight, borderRadius: Radius.md,
              padding: `${Space.sm}px ${Space.md}px`, marginBottom: Space.md,
              border: `1px solid ${Colors.error}30`,
            }}>
              <span style={{ fontSize: Font.sm, color: Colors.error, fontWeight: 600 }}>{errorMsg}</span>
            </div>
          )}

          <button
            onClick={handleSubmit}
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

          <div style={{ textAlign: 'right', marginTop: 8, marginBottom: 8 }}>
            <span
              onClick={() => navigate('/esqueci-senha')}
              style={{ color: Colors.primary, fontWeight: 600, cursor: 'pointer', fontSize: Font.sm }}
            >
              Esqueceu sua senha?
            </span>
          </div>

          {GOOGLE_CLIENT_ID && mode === 'paciente' && (
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
