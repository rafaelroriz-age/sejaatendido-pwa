import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerRequest } from '../services/api';
import { saveAuthSession } from '../storage/localStorage';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';
import LegalConsent, { LegalConsentErrors } from '../components/LegalConsent';
import { LEGAL_PRIVACY_VERSION, LEGAL_TERMS_VERSION } from '../config/legal';

type SignupStep = 1 | 2 | 3 | 4;

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

function normalizePhone(v: string): string {
  return v.replace(/\D/g, '');
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

function validatePassword(senha: string): string | null {
  if (senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres';
  if (!/[A-Z]/.test(senha)) return 'A senha deve conter pelo menos uma letra maiuscula';
  if (!/[a-z]/.test(senha)) return 'A senha deve conter pelo menos uma letra minuscula';
  if (!/[0-9]/.test(senha)) return 'A senha deve conter pelo menos um numero';
  if (!/[^A-Za-z0-9]/.test(senha)) return 'A senha deve conter pelo menos um caractere especial';
  return null;
}

export default function SignupScreen() {
  const navigate = useNavigate();

  const [step, setStep] = useState<SignupStep>(1);

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [tipo, setTipo] = useState<'PACIENTE' | 'MEDICO'>('PACIENTE');

  const [telefone, setTelefone] = useState('');

  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [crm, setCrm] = useState('');
  const [crmUf, setCrmUf] = useState('');

  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState(false);
  const [legalErrors, setLegalErrors] = useState<LegalConsentErrors>({});

  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const progress = useMemo(() => (step / 4) * 100, [step]);

  function validateStep(current: SignupStep): boolean {
    if (current === 1) {
      if (!nome.trim() || !email.trim()) {
        window.alert('Preencha nome e email para continuar.');
        return false;
      }
      const rawCpf = cpf.replace(/\D/g, '');
      if (rawCpf && !isValidCpf(rawCpf)) {
        window.alert('CPF invalido. Verifique os digitos.');
        return false;
      }
      if (tipo === 'MEDICO' && !rawCpf) {
        window.alert('Informe um CPF valido (11 digitos).');
        return false;
      }
      return true;
    }

    if (current === 2) {
      const normalized = normalizePhone(telefone);
      if (normalized.length < 10 || normalized.length > 11) {
        window.alert('Informe um telefone/WhatsApp valido com DDD.');
        return false;
      }
      return true;
    }

    if (current === 3) {
      const pwdError = validatePassword(senha);
      if (pwdError) {
        window.alert(pwdError);
        return false;
      }
      if (senha !== confirmaSenha) {
        window.alert('As senhas nao coincidem.');
        return false;
      }
      return true;
    }

    if (current === 4) {
      const nextErrors: LegalConsentErrors = {
        termos: aceitouTermos ? undefined : 'Voce precisa aceitar os Termos e Condicoes de Uso.',
        privacidade: aceitouPrivacidade ? undefined : 'Voce precisa aceitar a Politica de Privacidade.',
      };
      setLegalErrors(nextErrors);
      if (nextErrors.termos || nextErrors.privacidade) return false;
      return true;
    }

    return true;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    if (step < 4) setStep((step + 1) as SignupStep);
  }

  function handleBack() {
    if (step > 1) setStep((step - 1) as SignupStep);
  }

  async function handleSignup() {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) return;

    setLoading(true);
    try {
      const rawCpf = cpf.replace(/\D/g, '');
      const rawTelefone = normalizePhone(telefone);
      const payload: Parameters<typeof registerRequest>[0] = {
        nome: nome.trim(),
        email: email.trim(),
        cpf: rawCpf || undefined,
        telefone: rawTelefone,
        senha,
        tipo,
        aceitouTermos,
        aceitouPrivacidade,
        termosVersao: LEGAL_TERMS_VERSION,
        privacidadeVersao: LEGAL_PRIVACY_VERSION,
      };

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
    width: '100%',
    padding: Space.lg,
    fontSize: Font.md,
    color: Colors.textPrimary,
    backgroundColor: 'transparent',
    border: 'none',
    outline: 'none',
  };

  const wrapperStyle: React.CSSProperties = {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    marginBottom: Space.md + 2,
    border: `1px solid ${Colors.border}`,
  };

  if (registered) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
        <div style={{ backgroundColor: Colors.card, borderRadius: 24, padding: 36, textAlign: 'center', width: '100%', maxWidth: 380, boxShadow: '0 8px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.successLight, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: 32 }}>📨</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: Colors.textPrimary, marginBottom: 8 }}>Conta Criada!</h2>
          <p style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: '22px', marginBottom: 24 }}>
            Enviamos um email de confirmacao para <strong>{email}</strong>. Verifique sua caixa de entrada e spam para ativar sua conta.
            {tipo === 'MEDICO' && ' Apos confirmar o email, valide sua carteirinha CRM na area de perfil.'}
          </p>
          <button onClick={() => navigate('/login', { replace: true })} style={{ width: '100%', backgroundColor: Colors.primary, borderRadius: Radius.md, padding: Space.lg, border: 'none', cursor: 'pointer', boxShadow: `0 4px 8px ${Colors.primary}4D` }}>
            <span style={{ color: '#fff', fontSize: Font.md, fontWeight: 700 }}>Ir para Login</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: Colors.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 460 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <img src={`${import.meta.env.BASE_URL}logo-oficial.png`} alt="Seja Atendido" style={{ width: '100%', maxHeight: 120, objectFit: 'contain', marginBottom: 8 }} />
          <h1 style={{ fontSize: Font.xl - 4, fontWeight: 800, color: Colors.textPrimary }}>Criar Conta</h1>
          <p style={{ fontSize: Font.sm, color: Colors.textSecondary, marginBottom: 8 }}>Etapa {step} de 4</p>
          <div style={{ width: '100%', height: 8, backgroundColor: Colors.borderLight, borderRadius: Radius.full, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: Colors.primary, transition: 'width 0.25s ease' }} />
          </div>
        </div>

        <div style={{ backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Space.xl, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}>
          {step === 1 && (
            <>
              <h3 style={{ marginTop: 0, marginBottom: Space.md, color: Colors.textPrimary }}>Dados pessoais</h3>
              <div style={wrapperStyle}><input placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} disabled={loading} style={inputStyle} /></div>
              <div style={wrapperStyle}><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} style={inputStyle} /></div>
              <div style={wrapperStyle}><input type="tel" inputMode="numeric" placeholder="CPF" value={cpf} onChange={e => setCpf(applyCpfMask(e.target.value))} disabled={loading} style={inputStyle} /></div>

              <div style={{ marginBottom: Space.lg }}>
                <label style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: Space.sm }}>Tipo de conta</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['PACIENTE', 'MEDICO'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setTipo(t)}
                      disabled={loading}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        borderRadius: Radius.md,
                        border: `2px solid ${tipo === t ? Colors.primary : Colors.border}`,
                        backgroundColor: tipo === t ? Colors.accent : Colors.inputBg,
                        color: tipo === t ? Colors.primary : Colors.textSecondary,
                        fontWeight: 700,
                        fontSize: Font.sm,
                        cursor: 'pointer',
                      }}
                    >
                      {t === 'PACIENTE' ? 'Paciente' : 'Medico'}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 style={{ marginTop: 0, marginBottom: Space.md, color: Colors.textPrimary }}>Telefone</h3>
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
              <span style={{ fontSize: 12, color: Colors.textMuted, display: 'block' }}>
                Vamos usar este número para confirmação, lembrete e cancelamento de consultas.
              </span>
            </>
          )}

          {step === 3 && (
            <>
              <h3 style={{ marginTop: 0, marginBottom: Space.md, color: Colors.textPrimary }}>Credenciais</h3>
              <div style={wrapperStyle}><input type="password" placeholder="Senha (min. 8, maiusc., minusc., numero, especial)" value={senha} onChange={e => setSenha(e.target.value)} disabled={loading} style={inputStyle} /></div>
              <div style={wrapperStyle}><input type="password" placeholder="Confirmar senha" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} disabled={loading} style={inputStyle} /></div>

              {tipo === 'MEDICO' && (
                <>
                  <label style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: Space.sm }}>Dados Profissionais</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: Space.md + 2 }}>
                    <div style={{ ...wrapperStyle, flex: 2, marginBottom: 0 }}>
                      <input placeholder="Numero CRM" value={crm} onChange={e => setCrm(e.target.value.replace(/\D/g, ''))} disabled={loading} inputMode="numeric" style={inputStyle} />
                    </div>
                    <div style={{ ...wrapperStyle, flex: 1, marginBottom: 0 }}>
                      <input placeholder="UF" value={crmUf} onChange={e => setCrmUf(e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2))} disabled={loading} maxLength={2} style={inputStyle} />
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: Colors.textMuted, display: 'block', marginTop: -8, marginBottom: 12 }}>
                    Voce podera validar sua carteirinha CRM apos o cadastro.
                  </span>
                </>
              )}
            </>
          )}

          {step === 4 && (
            <>
              <h3 style={{ marginTop: 0, marginBottom: Space.md, color: Colors.textPrimary }}>Termos e privacidade</h3>
              <LegalConsent
                aceitouTermos={aceitouTermos}
                aceitouPrivacidade={aceitouPrivacidade}
                loading={loading}
                termosVersao={LEGAL_TERMS_VERSION}
                privacidadeVersao={LEGAL_PRIVACY_VERSION}
                errors={legalErrors}
                onChangeTermos={(value) => {
                  setAceitouTermos(value);
                  setLegalErrors(prev => ({ ...prev, termos: undefined }));
                }}
                onChangePrivacidade={(value) => {
                  setAceitouPrivacidade(value);
                  setLegalErrors(prev => ({ ...prev, privacidade: undefined }));
                }}
              />
            </>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: Space.md, position: 'sticky', bottom: 0, backgroundColor: Colors.card, paddingTop: 10, paddingBottom: 4 }}>
            <button
              onClick={handleBack}
              disabled={loading || step === 1}
              style={{
                flex: 1,
                backgroundColor: Colors.inputBg,
                borderRadius: Radius.md,
                padding: Space.lg,
                border: `1px solid ${Colors.border}`,
                cursor: loading || step === 1 ? 'not-allowed' : 'pointer',
                color: Colors.textSecondary,
                fontWeight: 700,
                opacity: step === 1 ? 0.5 : 1,
              }}
            >
              Voltar
            </button>

            {step < 4 ? (
              <button
                onClick={handleNext}
                disabled={loading}
                style={{
                  flex: 2,
                  backgroundColor: Colors.primary,
                  borderRadius: Radius.md,
                  padding: Space.lg,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  color: '#fff',
                  fontWeight: 700,
                }}
              >
                Continuar
              </button>
            ) : (
              <button
                onClick={handleSignup}
                disabled={loading}
                style={{
                  flex: 2,
                  backgroundColor: Colors.primary,
                  borderRadius: Radius.md,
                  padding: Space.lg,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  color: '#fff',
                  fontWeight: 700,
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? 'Cadastrando...' : 'Finalizar cadastro'}
              </button>
            )}
          </div>
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
