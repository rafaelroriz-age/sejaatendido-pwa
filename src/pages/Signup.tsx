import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerRequest } from '../services/api';
import { showErrorAlert } from '../utils/errorHandler';
import Colors, { Font, Space, Radius } from '../theme/colors';

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error('Falha ao ler arquivo de diploma'));
    reader.readAsDataURL(file);
  });
}

export default function SignupScreen() {
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmaSenha, setConfirmaSenha] = useState('');
  const [tipo, setTipo] = useState<'PACIENTE' | 'MEDICO'>('PACIENTE');
  const [crm, setCrm] = useState('');
  const [diplomaFile, setDiplomaFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const [registered, setRegistered] = useState(false);

  async function handleSignup() {
    if (!nome || !email || !senha || !confirmaSenha) { window.alert('Preencha todos os campos'); return; }
    if (senha !== confirmaSenha) { window.alert('As senhas não coincidem'); return; }
    if (senha.length < 8) { window.alert('A senha deve ter pelo menos 8 caracteres'); return; }
    if (!/[A-Z]/.test(senha)) { window.alert('A senha deve conter pelo menos uma letra maiúscula'); return; }
    if (!/[a-z]/.test(senha)) { window.alert('A senha deve conter pelo menos uma letra minúscula'); return; }
    if (!/[0-9]/.test(senha)) { window.alert('A senha deve conter pelo menos um número'); return; }
    if (!/[^A-Za-z0-9]/.test(senha)) { window.alert('A senha deve conter pelo menos um caractere especial'); return; }
    if (tipo === 'MEDICO' && !crm.trim()) { window.alert('Informe o número do CRM'); return; }
    if (tipo === 'MEDICO' && !diplomaFile) { window.alert('Envie o diploma para cadastro de médico'); return; }

    setLoading(true);
    try {
      const payload: Parameters<typeof registerRequest>[0] = {
        nome,
        email,
        senha,
        tipo,
      };
      if (tipo === 'MEDICO') {
        payload.crm = crm.trim().toUpperCase();
        if (diplomaFile) {
          payload.diplomaFileName = diplomaFile.name;
          payload.diplomaFileBase64 = await fileToBase64(diplomaFile);
        }
      }
      await registerRequest(payload);
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
          <div style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.successLight, display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px', fontSize: 32 }}>📧</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: Colors.textPrimary, marginBottom: 8 }}>Conta Criada!</h2>
          <p style={{ fontSize: 15, color: Colors.textSecondary, lineHeight: '22px', marginBottom: 24 }}>
            Enviamos um email de confirmação para <strong>{email}</strong>. Verifique sua caixa de entrada e spam para ativar sua conta.
            {tipo === 'MEDICO' && ' Seu cadastro médico será analisado pela equipe.'}
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
          <p style={{ fontSize: Font.sm, color: Colors.textSecondary, marginBottom: Space.xl }}>Preencha seus dados para começar</p>
        </div>

        <div style={{
          backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Space.xl,
          boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        }}>
          <div style={wrapperStyle}><input placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} disabled={loading} style={inputStyle} /></div>
          <div style={wrapperStyle}><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={loading} style={inputStyle} /></div>
          <div style={wrapperStyle}><input type="password" placeholder="Senha (mín. 8, maiúsc., minúsc., número, especial)" value={senha} onChange={e => setSenha(e.target.value)} disabled={loading} style={inputStyle} /></div>
          <div style={wrapperStyle}><input type="password" placeholder="Confirmar senha" value={confirmaSenha} onChange={e => setConfirmaSenha(e.target.value)} disabled={loading} style={inputStyle} /></div>

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
                  {t === 'PACIENTE' ? 'Paciente' : 'Médico'}
                </button>
              ))}
            </div>
          </div>

          {tipo === 'MEDICO' && (
            <div>
              <label style={{ fontSize: Font.sm, fontWeight: 700, color: Colors.textSecondary, display: 'block', marginBottom: Space.sm }}>Dados Profissionais</label>
              <div style={wrapperStyle}><input placeholder="Número do CRM" value={crm} onChange={e => setCrm(e.target.value.toUpperCase())} disabled={loading} style={{ ...inputStyle, textTransform: 'uppercase' }} /></div>
              <div style={wrapperStyle}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setDiplomaFile(e.target.files?.[0] || null)}
                  disabled={loading}
                  style={{ ...inputStyle, paddingTop: 12, paddingBottom: 12 }}
                />
              </div>
              <span style={{ fontSize: 12, color: Colors.textMuted, display: 'block', marginTop: -8, marginBottom: 12 }}>
                Envie diploma ou comprovante profissional (PDF ou imagem)
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
        </div>

        <div style={{ textAlign: 'center', marginTop: Space.xl }}>
          <span style={{ fontSize: Font.sm - 1, color: Colors.textSecondary }}>
            Já tem conta?{' '}
            <span onClick={() => navigate('/login')} style={{ color: Colors.primary, fontWeight: 700, cursor: 'pointer' }}>Fazer login</span>
          </span>
        </div>
      </div>
    </div>
  );
}
