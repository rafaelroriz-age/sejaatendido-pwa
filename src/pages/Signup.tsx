import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerRequest } from '../services/api';
import { saveAuthSession } from '../storage/localStorage';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';

function applyCpfMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

function maskPhone(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function isValidCpf(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '');
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(d[i]) * (10 - i);
  let r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  if (r !== parseInt(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(d[i]) * (11 - i);
  r = (sum * 10) % 11;
  if (r === 10 || r === 11) r = 0;
  return r === parseInt(d[10]);
}

export default function SignupScreen() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [tipo, setTipo] = useState<'PACIENTE' | 'MEDICO'>('PACIENTE');
  const [telefone, setTelefone] = useState('');
  const [crm, setCrm] = useState('');
  const [crmUf, setCrmUf] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  async function handleSignup() {
    if (!nome || !email || !senha || !confirmaSenha) { window.alert('Preencha todos os campos'); return; }
    if (senha !== confirmaSenha) { window.alert('As senhas nao coincidem'); return; }
    if (senha.length < 8) { window.alert('A senha deve ter pelo menos 8 caracteres'); return; }
    if (!/[A-Z]/.test(senha)) { window.alert('A senha deve conter pelo menos uma letra maiuscula'); return; }
    if (!/[a-z]/.test(senha)) { window.alert('A senha deve conter pelo menos uma letra minuscula'); return; }
    if (!/[0-9]/.test(senha)) { window.alert('A senha deve conter pelo menos um numero'); return; }
    if (!/[^A-Za-z0-9]/.test(senha)) { window.alert('A senha deve conter pelo menos um caractere especial'); return; }
    const rawCpf = cpf.replace(/\D/g, '');
    if (rawCpf && !isValidCpf(rawCpf)) { window.alert('CPF invalido. Verifique os digitos.'); return; }
    if (tipo === 'MEDICO' && !rawCpf) { window.alert('Informe um CPF valido (11 digitos)'); return; }
    if (!acceptedTerms) { window.alert('Você precisa aceitar os Termos de Uso e a Política de Privacidade.'); return; }

    setLoading(true);
    try {
      const rawTelefone = telefone.replace(/\D/g, '');
      const payload: Parameters<typeof registerRequest>[0] = {
        nome,
        email,
        cpf: rawCpf || undefined,
        telefone: rawTelefone || undefined,
        senha,
        tipo,
      };
      // Note: CRM number/UF are NOT part of registration — validated separately via /medicos/me/crm/validar-cartao
      const response = await registerRequest(payload);
      await saveAuthSession(response.accessToken, response.usuario, response.refreshToken);
      setRegistered(true);
    } catch (error) {
      showErrorAlert(error, 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: Space.lg, fontSize: Font.md,
    color: Colors.textPrimary, backgroundColor: 'transparent',
    border: 'none', outline: 'none',
  };
  const wrapperStyle: React.CSSProperties = {
    backgroundColor: Colors.inputBg, borderRadius: Radius.md,
    marginBottom: Space.md + 2, border: `1px solid ${Colors.border}`,
  };

  if (registered) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 36, textAlign: 'center', width: '100%', maxWidth: 380, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.successLight, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: 32 }}>&#128231;</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: Colors.textPrimary, marginBottom: 8 }}>Conta Criada!</h2>
          <p style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: '22px', marginBottom: 24 }}>
            Enviamos um email de confirmacao para <strong>{email}</strong>. Verifique sua caixa de entrada e spam para ativar sua conta.
            {tipo === 'MEDICO' && ' Apos confirmar o email, valide sua carteirinha CRM na area de perfil.'}
          </p>
          <button onClick={() => navigate('/login', { replace: true })} style={{
            width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Space.lg,
            border: 'none', cursor: 'pointer', boxShadow: `0 4px 8px ${Colors.primary}4D`,
          }}>
            <span style={{ color: '#fff', fontSize: Font.md, fontWeight: 700 }}>Ir para Login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img
            src={`${import.meta.env.BASE_URL}logo-oficial.png`}
            alt="Seja Atendido"
            style={{ width: '100%', maxHeight: 120, objectFit: 'contain', marginBottom: 8 }}
          />
          <h1 style={{ fontSize: Font.xl - 4, fontWeight: 800, color: Colors.textPrimary }}>Criar Conta</h1>
          <p style={{ fontSize: Font.sm, color: Colors.textSecondary, marginBottom: Space.xl }}>Preencha seus dados para comecar</p>
        </div>

        <div style={{
          backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Space.xl,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={wrapperStyle}>
            <input placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} disabled={loading} style={inputStyle} />
          </div>
          <div style={wrapperStyle}>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} style={inputStyle} />
          </div>
          <div style={wrapperStyle}>
            <input
              type="tel"
              placeholder="WhatsApp / Telefone (ex: (11) 99999-9999)"
              value={telefone}
              onChange={e => setTelefone(maskPhone(e.target.value))}
              disabled={loading}
              style={inputStyle}
            />
          </div>
          <div style={wrapperStyle}>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="CPF"
              value={cpf}
              onChange={e => setCpf(applyCpfMask(e.target.value))}
              disabled={loading}
              style={inputStyle}
            />
          </div>
          <div style={wrapperStyle}>
            <input type="password" placeholder="Senha (min. 8, maiusc., minusc., numero, especial)" value={senha} onChange={e => setSenha(e.target.value)} disabled={loading} style={inputStyle} />
          </div>
          <div style={wrapperStyle}>
            <input type="password" placeholder="Confirmar senha" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} disabled={loading} style={inputStyle} />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: Space.lg }}>
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={e => setAcceptedTerms(e.target.checked)}
              disabled={loading}
              style={{ marginTop: 4, width: 18, height: 18 }}
            />
            <div style={{ fontSize: Font.sm, color: Colors.textSecondary, lineHeight: '20px' }}>
              Li e aceito os{' '}
              <span onClick={() => navigate('/termos-e-condicoes')} style={{ color: Colors.primary, fontWeight: 700, cursor: 'pointer' }}>
                Termos de Uso
              </span>{' '}
              e a{' '}
              <span onClick={() => navigate('/termos-e-condicoes')} style={{ color: Colors.primary, fontWeight: 700, cursor: 'pointer' }}>
                Política de Privacidade
              </span>.
            </div>
          </div>

          <div style={{ marginBottom: Space.lg }}>
            <label style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: Space.sm }}>Tipo de conta</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['PACIENTE', 'MEDICO'] as const).map(t => (
                <button key={t} onClick={() => setTipo(t)} disabled={loading}
                  style={{
                    flex: 1, padding: '12px 16px', borderRadius: Radius.md, border: `2px solid ${tipo === t ? Colors.primary : Colors.border}`,
                    backgroundColor: tipo === t ? Colors.accent : Colors.inputBg, color: tipo === t ? Colors.primary : Colors.textSecondary,
                    fontWeight: 700, fontSize: Font.sm, cursor: 'pointer',
                  }}
                >
                  {t === 'PACIENTE' ? 'Paciente' : 'Medico'}
                </button>
              ))}
            </div>
          </div>

          {tipo === 'MEDICO' && (
            <div>
              <label style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: Space.sm }}>Dados Profissionais</label>
              <div style={{ display: 'flex', gap: 8, marginBottom: Space.md + 2 }}>
                <div style={{ ...wrapperStyle, flex: 2, marginBottom: 0 }}>
                  <input
                    placeholder="Numero CRM"
                    value={crm}
                    onChange={e => setCrm(e.target.value.replace(/\D/g, ''))}
                    disabled={loading}
                    inputMode="numeric"
                    style={inputStyle}
                  />
                </div>
                <div style={{ ...wrapperStyle, flex: 1, marginBottom: 0 }}>
                  <input
                    placeholder="UF"
                    value={crmUf}
                    onChange={e => setCrmUf(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))}
                    disabled={loading}
                    maxLength={2}
                    style={inputStyle}
                  />
                </div>
              </div>
              <span style={{ fontSize: 12, color: Colors.textMuted, display: 'block', marginTop: -8, marginBottom: 12 }}>
                Voce podera validar sua carteirinha CRM apos o cadastro.
              </span>
            </div>
          )}

          <button onClick={handleSignup} disabled={loading}
            style={{
              width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md,
              padding: Space.lg, border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: Space.sm, opacity: loading ? 0.6 : 1,
              boxShadow: `0 6px 12px ${Colors.primary}59`,
            }}
          >
            {loading ? <div className="spinner" /> : <span style={{ color: '#fff', fontSize: Font.md + 1, fontWeight: 700 }}>Cadastrar</span>}
          </button>

          <button
            type="button"
            onClick={() => navigate('/termos-e-condicoes')}
            style={{
              width: '100%', marginTop: 10, background: 'transparent', border: `1px solid ${Colors.border}`,
              borderRadius: Radius.md, padding: Space.md, color: Colors.textSecondary, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Ler termos e condições
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: Space.xl }}>
          <span style={{ fontSize: Font.sm - 1, color: Colors.textSecondary }}>
            Ja tem conta?{' '}
            <span onClick={() => navigate('/login')} style={{ color: Colors.primary, fontWeight: 700, cursor: 'pointer' }}>Fazer login</span>
          </span>
        </div>
      </div>
    </div>
  );
}
